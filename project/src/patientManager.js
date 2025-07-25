// src/patientManager.js

/**
 * @fileoverview Manages patient-specific functionalities, including
 * practice sessions, audio recording, and displaying results/history.
 */

import {
    DOMElements,
    updateCurrentSentence,
    updateRecordingStatus,
    toggleRecordStopButtons,
    showLoader,
    displaySentenceResults,
    showPatientView,
    renderProgressChart,
    renderDailySessionsChart, // NEW: Import for daily sessions chart
    updateHistoryList,
    updateUserIdDisplay,
    renderPatientFeedbackList, // Correct import for patient's feedback list
    renderPatientAssignedExercises, // Import for rendering assigned exercises
    updatePatientDashboardStats, // Import for updating patient dashboard stats
    playTextAsSpeech // NEW: Import for playing text as speech
} from './uiManager.js';
import { SENTENCES_TO_PRACTICE, EXERCISE_SENTENCES } from './constants.js'; // Import EXERCISE_SENTENCES
import {
    savePronunciationResult,
    listenToPronunciationHistory,
    getUserId,
    listenToPatientFeedback,
    listenToAssignedExercises, // Import for listening to assigned exercises
    fetchPatientTodaysSessions, // Import for patient's today's sessions
    fetchPatientPracticeStreak, // Import for patient's practice streak
    fetchNewFeedbackCount, // Import for patient's new feedback count
    markFeedbackAsRead // Import to mark feedback as read
} from './firebaseService.js';
// Import getPronunciationAnalysis from analysisService.js
import { getPronunciationAnalysis } from './analysisService.js';
// Import functions from audioRecorder.js, giving them aliases to avoid naming conflicts
import { startRecording as startAudioRecording, stopRecording as stopAudioRecording, cleanupAudioResources } from './audioRecorder.js';

// Global variables for patient session management
let sessionSentences = []; // Will be populated by assigned exercises or default sentences
let currentSentenceIndex = 0;
let currentAudioUrl = null; // To store the URL of the last recorded audio

let historyUnsubscribe = null; // Variable to store the unsubscribe function for history listener
let feedbackUnsubscribe = null; // Variable to store the unsubscribe function for feedback listener
let assignedExercisesUnsubscribe = null; // Variable for assigned exercises listener

/**
 * Initializes the patient interface, sets up event listeners, and loads initial data.
 */
export async function initializePatientInterface() {
    console.log("Initializing Patient Interface...");

    // Display user ID
    const userId = getUserId();
    if (userId) {
        updateUserIdDisplay(userId);
    } else {
        updateUserIdDisplay("Not logged in");
    }

    // Set up navigation listeners
    DOMElements.patientNavBtns.forEach(btn => {
        // Remove existing listener to prevent duplicates if initializePatientInterface is called multiple times
        btn.removeEventListener('click', handlePatientNavClick);
        btn.addEventListener('click', handlePatientNavClick);
    });

    // Attach record/stop/next/start new session listeners
    attachPracticeListeners();

    // Attach listener for mispronounced words container
    // Using event delegation for dynamically added buttons
    if (DOMElements.practiceWordsContainer) {
        DOMElements.practiceWordsContainer.removeEventListener('click', handleMispronouncedWordClick); // Prevent duplicates
        DOMElements.practiceWordsContainer.addEventListener('click', handleMispronouncedWordClick);
    }

    // Default to Dashboard view on load and load exercises
    showPatientView('patientDashboard');
    // Ensure assigned exercises are loaded and dashboard stats are updated on initial load
    await loadAndDisplayAssignedExercises();
    await updatePatientDashboard();


    // If the default view is 'patientPractice' or user navigates to it, start a session
    // This check ensures we don't start a session if the dashboard is the initial view.
    if (document.getElementById('patientPractice').classList.contains('hidden') === false) {
        startNewPracticeSession();
    }
}

/**
 * Handles clicks on patient navigation buttons.
 * @param {Event} event - The click event.
 */
function handlePatientNavClick(event) {
    const viewId = event.target.dataset.view;
    showPatientView(viewId);
    // Handle view-specific initializations or data loading
    requestAnimationFrame(() => { // Defer to allow DOM to render visibility changes
        if (viewId === 'patientDashboard') {
            loadAndDisplayAssignedExercises(); // Load assigned exercises
            updatePatientDashboard(); // Update dashboard stats
        } else if (viewId === 'patientPractice') {
            startNewPracticeSession(); // Start a new session when navigating to practice
        } else if (viewId === 'patientHistory') {
            loadAndDisplayHistory();
        } else if (viewId === 'patientFeedback') {
            loadAndDisplayFeedback();
        }
    });
}

/**
 * Updates the patient dashboard statistics.
 */
async function updatePatientDashboard() {
    console.log("Updating patient dashboard statistics...");
    const patientId = getUserId();
    if (!patientId) {
        console.error("User ID not available for updating patient dashboard.");
        return;
    }

    try {
        const todaysSessions = await fetchPatientTodaysSessions(patientId);
        const practiceStreak = await fetchPatientPracticeStreak(patientId);
        const newFeedback = await fetchNewFeedbackCount(patientId);

        // Assuming a daily goal of 10 sentences for now. This could be configurable later.
        const dailyGoalTotal = 10;
        updatePatientDashboardStats(todaysSessions, dailyGoalTotal, practiceStreak, newFeedback);
    } catch (error) {
        console.error("Error updating patient dashboard stats:", error);
        updatePatientDashboardStats('N/A', 'N/A', 'N/A', 'N/A'); // Display N/A on error
    }
}


/**
 * Starts a new practice session by resetting the sentence index and displaying the first sentence.
 */
export function startNewPracticeSession() {
    console.log("Starting new practice session.");
    currentSentenceIndex = 0;
    displayCurrentSentence();
    // Hide "Start New Session" button and show "Next Sentence" if applicable
    DOMElements.startNewSessionBtn.classList.add('hidden');
    DOMElements.nextSentenceBtn.classList.remove('hidden');
    DOMElements.congratulations.classList.add('hidden'); // Hide congratulations
}

/**
 * Displays the current sentence from the practice list.
 */
function displayCurrentSentence() {
    // Use sessionSentences which is populated by assigned exercises or default.
    if (sessionSentences.length > 0 && currentSentenceIndex < sessionSentences.length) {
        updateCurrentSentence(sessionSentences[currentSentenceIndex]);
        DOMElements.recordButton.classList.remove('hidden');
        DOMElements.stopButton.classList.add('hidden');
        DOMElements.loader.classList.add('hidden');
        DOMElements.resultsContent.classList.add('hidden');
        DOMElements.waveformCanvas.classList.add('hidden'); // Hide waveform for new sentence
        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl); // Clean up previous audio blob URL
            currentAudioUrl = null;
        }
        updateRecordingStatus('Click Record to start');
    } else {
        updateCurrentSentence("You've completed all sentences in this set!");
        updateRecordingStatus("Click 'Start New Session' to practice more.");
        DOMElements.recordButton.classList.add('hidden');
        DOMElements.stopButton.classList.add('hidden');
        DOMElements.nextSentenceBtn.classList.add('hidden');
        DOMElements.startNewSessionBtn.classList.remove('hidden');
        DOMElements.congratulations.classList.remove('hidden'); // Show overall congratulations
    }
}

/**
 * Handles the completion of a recording. This is passed as a callback to audioRecorder.js.
 * @param {Float32Array} audioData - The recorded audio data as Float32Array (16kHz mono).
 * @param {string} audioUrl - The URL of the recorded audio blob.
 */
async function handleRecordingComplete(audioData, audioUrl) {
    console.log("patientManager: handleRecordingComplete called.");
    updateRecordingStatus('Processing...');
    showLoader(true);
    toggleRecordStopButtons(false); // Ensure buttons are reset

    if (!audioData || !audioUrl) {
        console.error("No audio data or URL received for analysis.");
        updateRecordingStatus("Analysis failed: No audio recorded.");
        showLoader(false);
        return;
    }

    currentAudioUrl = audioUrl; // Store URL for playback

    updateRecordingStatus('Analyzing speech...');
    const currentSentence = DOMElements.currentSentenceElement.textContent; // Get the currently displayed sentence

    try {
        // Call getPronunciationAnalysis from analysisService.js
        // This function now handles both transcription and the pronunciation analysis logic
        const analysis = await getPronunciationAnalysis(audioData, currentSentence);

        displaySentenceResults(analysis, currentAudioUrl);

        const userId = getUserId();
        if (userId) {
            // savePronunciationResult expects (sentence, overallScore, wordDetails)
            await savePronunciationResult(currentSentence, analysis.overallScore, analysis.words);
            console.log("Pronunciation result saved.");
            // After saving a result, update the dashboard stats
            updatePatientDashboard();
        } else {
            console.error("User ID not available, cannot save pronunciation result.");
        }
        updateRecordingStatus("Analysis complete!");

    } catch (error) {
        console.error("Transcription or analysis failed:", error);
        updateRecordingStatus("Error during analysis. Please try again.");
        showLoader(false);
    } finally {
        // AudioContext cleanup is now handled by audioRecorder.js's cleanupAudioResources
    }
}

/**
 * Handles click events on the mispronounced words container.
 * Uses event delegation to listen for clicks on buttons with class 'listen-word-btn'.
 * @param {Event} event - The click event.
 */
function handleMispronouncedWordClick(event) {
    const targetButton = event.target.closest('.listen-word-btn');
    if (targetButton) {
        const wordToSpeak = targetButton.dataset.word;
        if (wordToSpeak) {
            playTextAsSpeech(wordToSpeak);
        }
    }
}

/**
 * Loads and displays the patient's pronunciation history.
 */
function loadAndDisplayHistory() {
    console.log("Loading and displaying history...");
    const userId = getUserId();
    if (!userId) {
        console.error("User ID not available for loading history.");
        return;
    }

    // Unsubscribe from previous listener if active
    if (historyUnsubscribe) {
        historyUnsubscribe();
        console.log("Unsubscribed from previous history listener.");
    }
    // Set up new real-time listener
    historyUnsubscribe = listenToPronunciationHistory(userId, (historyData) => {
        console.log("Received updated history data:", historyData);
        updateHistoryList(historyData);
        renderProgressChart(historyData); // historyData is already sorted desc by timestamp
        renderDailySessionsChart(historyData); // NEW: Render daily sessions chart
    });
}

/**
 * Loads and displays the patient's feedback.
 */
function loadAndDisplayFeedback() {
    console.log("Loading and displaying patient feedback...");
    const patientId = getUserId();
    if (!patientId) {
        console.error("Patient ID not available for loading feedback.");
        return;
    }
    // Unsubscribe from previous listener if active
    if (feedbackUnsubscribe) {
        feedbackUnsubscribe();
        console.log("Unsubscribed from previous feedback listener.");
    }
    // Set up new real-time listener
    feedbackUnsubscribe = listenToPatientFeedback(patientId, (feedbackData) => {
        console.log("Received updated feedback data:", feedbackData);
        renderPatientFeedbackList(feedbackData);

        // Mark all feedback as read once the feedback tab is viewed
        feedbackData.forEach(feedback => {
            if (feedback.read === false) {
                markFeedbackAsRead(patientId, feedback.id);
            }
        });
        // After marking as read, update the dashboard stats to reflect the change
        updatePatientDashboard();
    });
}

/**
 * Loads and displays the patient's assigned exercises.
 */
async function loadAndDisplayAssignedExercises() {
    console.log("Loading and displaying assigned exercises...");
    const patientId = getUserId();
    if (!patientId) {
        console.error("Patient ID not available for loading assigned exercises.");
        return;
    }
    // Unsubscribe from previous listener if active
    if (assignedExercisesUnsubscribe) {
        assignedExercisesUnsubscribe();
        console.log("Unsubscribed from previous assigned exercises listener.");
    }
    // Set up new real-time listener
    assignedExercisesUnsubscribe = listenToAssignedExercises(patientId, (exercisesData) => {
        console.log("Received updated assigned exercises data:", exercisesData);
        renderPatientAssignedExercises(exercisesData);

        // Map assigned exercise names to their full sentence lists
        let newSessionSentences = [];
        if (exercisesData.length > 0) {
            exercisesData.forEach(assignedEx => {
                const exerciseName = assignedEx.exerciseName;
                const sentencesForExercise = EXERCISE_SENTENCES[exerciseName];
                if (sentencesForExercise) {
                    newSessionSentences = newSessionSentences.concat(sentencesForExercise);
                } else {
                    console.warn(`No specific sentences found for exercise: ${exerciseName}. Using default sentences.`);
                    newSessionSentences = newSessionSentences.concat(SENTENCES_TO_PRACTICE);
                }
            });
        } else {
            console.log("No exercises assigned, falling back to default sentences.");
            newSessionSentences = SENTENCES_TO_PRACTICE; // Fallback to default if no exercises assigned
        }
        sessionSentences = newSessionSentences; // Update the global sessionSentences
        console.log("Updated sessionSentences for practice:", sessionSentences);
    });
}

/**
 * Attaches event listeners specific to the patient's practice section.
 */
function attachPracticeListeners() {
    // Record button listener
    if (DOMElements.recordButton) {
        DOMElements.recordButton.removeEventListener('click', handleRecordClick); // Remove previous to prevent duplicates
        DOMElements.recordButton.addEventListener('click', handleRecordClick); // Fixed typo: DOMEElements -> DOMElements
    }

    // Stop button listener
    if (DOMElements.stopButton) {
        DOMElements.stopButton.removeEventListener('click', handleStopClick); // Remove previous to prevent duplicates
        DOMElements.stopButton.addEventListener('click', handleStopClick);
    }

    // Next Sentence button listener
    if (DOMElements.nextSentenceBtn) {
        DOMElements.nextSentenceBtn.removeEventListener('click', handleNextSentenceClick); // Remove previous
        DOMElements.nextSentenceBtn.addEventListener('click', handleNextSentenceClick);
    }

    // Start New Session button listener
    if (DOMElements.startNewSessionBtn) {
        DOMElements.startNewSessionBtn.removeEventListener('click', startNewPracticeSession); // Remove previous
        DOMElements.startNewSessionBtn.addEventListener('click', startNewPracticeSession);
    }
}

/**
 * Handler for the record button click.
 */
function handleRecordClick() {
    updateRecordingStatus('Recording...');
    toggleRecordStopButtons(true);
    DOMElements.waveformCanvas.classList.remove('hidden'); // Show waveform canvas
    // Call startRecording from audioRecorder.js, passing the waveform canvas and the callback
    startAudioRecording(DOMElements.waveformCanvas, handleRecordingComplete);
}

/**
 * Handler for the stop button click.
 */
function handleStopClick() {
    updateRecordingStatus('Processing...');
    toggleRecordStopButtons(false);
    stopAudioRecording(); // Just call stop, the callback (handleRecordingComplete) will be triggered by audioRecorder.js
}

/**
 * Handler for the next sentence button click.
 */
function handleNextSentenceClick() {
    currentSentenceIndex++;
    displayCurrentSentence();
}

/**
 * Cleans up patient-specific listeners and state when logging out or switching roles.
 */
export function cleanupPatientListeners() {
    console.log("Cleaning up patient listeners.");
    // Remove event listeners
    if (DOMElements.recordButton) DOMElements.recordButton.removeEventListener('click', handleRecordClick);
    if (DOMElements.stopButton) DOMElements.stopButton.removeEventListener('click', handleStopClick);
    if (DOMElements.nextSentenceBtn) DOMElements.nextSentenceBtn.removeEventListener('click', handleNextSentenceClick);
    if (DOMElements.startNewSessionBtn) DOMElements.startNewSessionBtn.removeEventListener('click', startNewPracticeSession);
    DOMElements.patientNavBtns.forEach(btn => {
        btn.removeEventListener('click', handlePatientNavClick);
    });
    if (DOMElements.practiceWordsContainer) {
        DOMElements.practiceWordsContainer.removeEventListener('click', handleMispronouncedWordClick);
    }

    // Unsubscribe from any active Firestore listeners
    if (historyUnsubscribe) {
        historyUnsubscribe();
        historyUnsubscribe = null;
        console.log("Unsubscribed from patient history listener during cleanup.");
    }
    if (feedbackUnsubscribe) {
        feedbackUnsubscribe();
        feedbackUnsubscribe = null;
        console.log("Unsubscribed from patient feedback listener during cleanup.");
    }
    if (assignedExercisesUnsubscribe) {
        assignedExercisesUnsubscribe();
        assignedExercisesUnsubscribe = null;
        console.log("Unsubscribed from patient assigned exercises listener during cleanup.");
    }

    // Clean up audio resources managed by audioRecorder.js
    cleanupAudioResources();

    // Reset UI elements
    updateRecordingStatus("");
    showLoader(false);
    if (DOMElements.resultsContent) DOMElements.resultsContent.classList.add('hidden');
    if (DOMElements.currentSentenceElement) DOMElements.currentSentenceElement.textContent = "";
    if (DOMElements.waveformCanvas) DOMElements.waveformCanvas.classList.add('hidden');
    if (DOMElements.congratulations) DOMElements.congratulations.classList.add('hidden');
    if (DOMElements.audioPlayback) DOMElements.audioPlayback.classList.add('hidden');
    if (DOMElements.nextSentenceBtn) DOMElements.nextSentenceBtn.classList.add('hidden');
    if (DOMElements.startNewSessionBtn) DOMElements.startNewSessionBtn.classList.add('hidden');
    if (DOMElements.historyList) DOMElements.historyList.innerHTML = '';
    if (DOMElements.patientFeedbackList) DOMElements.patientFeedbackList.innerHTML = '';
    if (DOMElements.patientAssignedExercises) DOMElements.patientAssignedExercises.innerHTML = '<p class="text-gray-500">No exercises assigned yet.</p>';
}
