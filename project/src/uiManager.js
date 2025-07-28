// src/uiManager.js

/**
 * @fileoverview Manages all user interface interactions and DOM manipulations.
 * This includes showing/hiding different views, updating content, and rendering charts.
 */

// Declare DOMElements as a mutable object.
export const DOMElements = {};

// Chart instances
let progressChartInstance = null;
let dailySessionsChartInstance = null;
let doctorPatientChartInstance = null;
let doctorWordAccuracyChartInstance = null;

/**
 * Initializes all DOM elements by getting their references from the document.
 * This function MUST be called after the DOM is fully loaded.
 */
export function initializeDOMElements() {
    console.log("Initializing DOMElements...");

    // Auth modals
    DOMElements.loginModal = document.getElementById('loginModal');
    DOMElements.registerModal = document.getElementById('registerModal');
    DOMElements.loginEmail = document.getElementById('loginEmail');
    DOMElements.loginPassword = document.getElementById('loginPassword');
    DOMElements.loginSubmitBtn = document.getElementById('loginSubmitBtn');
    DOMElements.loginMessage = document.getElementById('loginMessage');
    DOMElements.showRegisterFromLogin = document.getElementById('showRegisterFromLogin');
    DOMElements.doctorLatestSessionSentence = document.getElementById('doctorLatestSessionSentence');
    DOMElements.doctorLatestSessionScore = document.getElementById('doctorLatestSessionScore');
    DOMElements.doctorLatestSessionAudio = document.getElementById('doctorLatestSessionAudio');


    DOMElements.registerFullName = document.getElementById('registerFullName');
    DOMElements.registerEmail = document.getElementById('registerEmail');
    DOMElements.registerPassword = document.getElementById('registerPassword');
    DOMElements.registerSubmitBtn = document.getElementById('registerSubmitBtn');
    DOMElements.registerMessage = document.getElementById('registerMessage');
    DOMElements.showLoginFromRegister = document.getElementById('showLoginFromRegister');

    // ✅ New Registration Fields
    DOMElements.registerAge = document.getElementById('registerAge');                  // Patient Age
    DOMElements.registerSpecialty = document.getElementById('registerSpecialty');      // Doctor Specialty
    DOMElements.genderRadios = document.querySelectorAll('input[name="genderSelect"]'); // Patient Gender radios

    // User info display
    DOMElements.userNameDisplay = document.getElementById('userNameDisplay');
    DOMElements.userIdDisplay = document.getElementById('userIdDisplay');

    // Interfaces
    DOMElements.patientInterface = document.getElementById('patientInterface');
    DOMElements.doctorInterface = document.getElementById('doctorInterface');
    DOMElements.patientLogoutBtn = document.getElementById('patientLogoutBtn');
    DOMElements.doctorLogoutBtn = document.getElementById('doctorLogoutBtn');
    DOMElements.confettiContainer = document.getElementById('confetti-container');

    // Patient UI elements
    DOMElements.patientNavBtns = document.querySelectorAll('.patient-nav-btn');
    DOMElements.patientViews = document.querySelectorAll('.patient-view');
    DOMElements.recordButton = document.getElementById('recordButton');
    DOMElements.stopButton = document.getElementById('stopButton');
    DOMElements.currentSentenceElement = document.getElementById('currentSentence');
    DOMElements.recordingStatus = document.getElementById('recordingStatus');
    DOMElements.loader = document.getElementById('loader');
    DOMElements.resultsContent = document.getElementById('resultsContent');
    DOMElements.overallScore = document.getElementById('overallScore');
    DOMElements.progressBar = document.getElementById('progressBar');
    DOMElements.detailedBreakdown = document.getElementById('detailedBreakdown');
    DOMElements.practiceSection = document.getElementById('practiceSection');
    DOMElements.practiceWordsContainer = document.getElementById('practiceWordsContainer');
    DOMElements.nextSentenceBtn = document.getElementById('nextSentenceBtn');
    DOMElements.startNewSessionBtn = document.getElementById('startNewSessionBtn');
    DOMElements.historyList = document.getElementById('historyList');
    DOMElements.waveformCanvas = document.getElementById('waveform');
    DOMElements.congratulations = document.getElementById('congratulations');
    DOMElements.audioPlayback = document.getElementById('audioPlayback');
    DOMElements.recordedAudio = document.getElementById('recordedAudio');
    DOMElements.patientFeedbackList = document.getElementById('patientFeedbackList');
    DOMElements.patientAssignedExercises = document.getElementById('patientAssignedExercises');
    DOMElements.progressChart = document.getElementById('progressChart');
    DOMElements.dailySessionsChart = document.getElementById('dailySessionsChart');

    // Patient Dashboard Stats
    DOMElements.dailyGoalSentences = document.getElementById('dailyGoalSentences');
    DOMElements.practiceStreakDays = document.getElementById('practiceStreakDays');
    DOMElements.newFeedbackCount = document.getElementById('newFeedbackCount');

    // Rubric sliders and labels
    DOMElements.mispronunciationWeight = document.getElementById('mispronunciationWeight');
    DOMElements.omissionWeight = document.getElementById('omissionWeight');
    DOMElements.insertionWeight = document.getElementById('insertionWeight');
    DOMElements.clarityThreshold = document.getElementById('clarityThreshold');

    DOMElements.mispronunciationWeightValue = document.getElementById('mispronunciationWeightValue');
    DOMElements.omissionWeightValue = document.getElementById('omissionWeightValue');
    DOMElements.insertionWeightValue = document.getElementById('insertionWeightValue');
    DOMElements.clarityThresholdValue = document.getElementById('clarityThresholdValue');

    // Rubric modal
    DOMElements.rubricMessage = document.getElementById('rubricMessage');
    DOMElements.customizeRubricModal = document.getElementById('customizeRubricModal');


    // Doctor UI elements
    DOMElements.patientList = document.getElementById('patientList');
    DOMElements.doctorDashboardView = document.getElementById('doctorDashboardView');
    DOMElements.patientDetailsView = document.getElementById('patientDetailsView');
    DOMElements.backToPatientListBtn = document.getElementById('backToPatientListBtn');
    DOMElements.patientDetailsName = document.getElementById('patientDetailsName');
    DOMElements.doctorPatientChartCanvas = document.getElementById('doctorPatientChart');
    DOMElements.doctorWordAccuracyChart = document.getElementById('doctorWordAccuracyChart');
    DOMElements.doctorFeedbackTextarea = document.getElementById('doctorFeedbackTextarea');
    DOMElements.sendFeedbackBtn = document.getElementById('sendFeedbackBtn');
    DOMElements.doctorPatientFeedbackHistory = document.getElementById('doctorPatientFeedbackHistory');
    DOMElements.patientSearchInput = document.getElementById('patientSearchInput');
    DOMElements.doctorAssignedExercisesHistory = document.getElementById('doctorAssignedExercisesHistory');

    // Doctor Stats
    DOMElements.activePatientsCount = document.getElementById('activePatientsCount');
    DOMElements.todaysSessionsCount = document.getElementById('todaysSessionsCount');
    DOMElements.alertsCount = document.getElementById('alertsCount');

    console.log("DOMElements initialized:", DOMElements);
}

/**
 * Shows the specified interface (login, register, patient, doctor).
 */
export function showInterface(interfaceName) {
    console.log("showInterface:", interfaceName);

    // Hide all views
    DOMElements.loginModal?.classList.add('hidden');
    DOMElements.registerModal?.classList.add('hidden');
    DOMElements.patientInterface?.classList.add('hidden');
    DOMElements.doctorInterface?.classList.add('hidden');

    if (interfaceName === 'login') {
        DOMElements.loginModal.classList.remove('hidden');
    } else if (interfaceName === 'register') {
        DOMElements.registerModal.classList.remove('hidden');
    } else if (interfaceName === 'patient') {
        DOMElements.patientInterface.classList.remove('hidden');
    } else if (interfaceName === 'doctor') {
        DOMElements.doctorInterface.classList.remove('hidden');
    }
}

/**
 * Update authenticated user's info display
 */
export function updateUserInfo(name, uid) {
    if (DOMElements.userNameDisplay) {
        DOMElements.userNameDisplay.textContent = `Welcome, ${name}`;
    }
    if (DOMElements.userIdDisplay) {
        DOMElements.userIdDisplay.textContent = `UID: ${uid}`;
    }
}



/**
 * Shows a specific patient view tab (Dashboard, Practice, History, Feedback).
 * Updates navigation button styling.
 * @param {string} viewId - The ID of the patient view to show (e.g., 'patientDashboard').
 */
export function showPatientView(viewId) {
    console.log("showPatientView called with:", viewId);
    if (!DOMElements.patientViews || DOMElements.patientViews.length === 0) {
        console.error("Patient views not found. Ensure DOMElements are initialized and patient-view elements exist.");
        return;
    }
    DOMElements.patientViews.forEach(view => view.classList.add('hidden'));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    } else {
        console.error(`Patient view with ID "${viewId}" not found.`);
    }

    DOMElements.patientNavBtns.forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-500');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    // Ensure the button for the active view is highlighted
    const activeBtn = document.querySelector(`.patient-nav-btn[data-view="${viewId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('border-blue-500', 'text-blue-500');
    }
}

/**
 * Updates the current sentence displayed to the user.
 * @param {string} sentence - The sentence to display.
 */
export function updateCurrentSentence(sentence) {
    console.log("updateCurrentSentence called with:", sentence);
    if (DOMElements.currentSentenceElement) {
        DOMElements.currentSentenceElement.textContent = sentence;
    }
    // Ensure relevant UI elements are hidden/shown for a new sentence
    if (DOMElements.resultsContent) DOMElements.resultsContent.classList.add('hidden');
    if (DOMElements.nextSentenceBtn) DOMElements.nextSentenceBtn.classList.add('hidden');
    if (DOMElements.congratulations) DOMElements.congratulations.classList.add('hidden');
    if (DOMElements.audioPlayback) DOMElements.audioPlayback.classList.add('hidden');
    if (DOMElements.stopButton) DOMElements.stopButton.classList.add('hidden');
    if (DOMElements.recordButton) DOMElements.recordButton.classList.remove('hidden');
}

/**
 * Updates the recording status message.
 * @param {string} status - The status message to display.
 */
export function updateRecordingStatus(status) {
    console.log("updateRecordingStatus called with:", status);
    if (DOMElements.recordingStatus) {
        DOMElements.recordingStatus.textContent = status;
    }
}

/**
 * Toggles the visibility of record and stop buttons.
 * @param {boolean} isRecording - True if recording is active, false otherwise.
 */
export function toggleRecordStopButtons(isRecording) {
    console.log("toggleRecordStopButtons called with isRecording:", isRecording);
    if (DOMElements.recordButton && DOMElements.stopButton) {
        if (isRecording) {
            DOMElements.recordButton.classList.add('hidden');
            DOMElements.stopButton.classList.remove('hidden');
        } else {
            DOMElements.stopButton.classList.add('hidden');
            DOMElements.recordButton.classList.remove('hidden');
        }
    }
}

/**
 * Shows or hides the analysis loader.
 * @param {boolean} show - True to show, false to hide.
 */
export function showLoader(show) {
    console.log("showLoader called with:", show);
    if (DOMElements.loader && DOMElements.resultsContent) {
        if (show) {
            DOMElements.loader.classList.remove('hidden');
            DOMElements.resultsContent.classList.add('hidden');
        } else {
            DOMElements.loader.classList.add('hidden');
        }
    }
}

/**
 * Plays the given text as speech using the Web Speech API.
 * @param {string} text - The text to be spoken.
 */
export function playTextAsSpeech(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Set language
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1; // Normal pitch
        window.speechSynthesis.speak(utterance);
        console.log(`Playing speech for: "${text}"`);
    } else {
        console.warn("Web Speech API not supported in this browser.");
        // Optionally, display a message to the user
    }
}

/**
 * Displays the pronunciation analysis results on the UI.
 * @param {Object} analysis - The analysis object containing overallScore and words.
 * @param {string} audioUrl - The URL of the recorded audio.
 */
export function displaySentenceResults(analysis, audioUrl) {
    console.log("displaySentenceResults called with analysis:", analysis, "audioUrl:", audioUrl);
    showLoader(false); // Hide loader
    if (DOMElements.resultsContent) DOMElements.resultsContent.classList.remove('hidden');
    if (DOMElements.audioPlayback) DOMElements.audioPlayback.classList.remove('hidden');
    if (DOMElements.recordedAudio) DOMElements.recordedAudio.src = audioUrl; // Set recorded audio source

    const score = Math.round(analysis.overallScore);
    if (DOMElements.overallScore) DOMElements.overallScore.textContent = `${score}%`;
    if (DOMElements.progressBar) DOMElements.progressBar.style.width = `${score}%`;

    // Show confetti if score is high
    if (score >= 80) {
        if (DOMElements.congratulations) DOMElements.congratulations.classList.remove('hidden');
        launchConfetti();
    } else {
        if (DOMElements.congratulations) DOMElements.congratulations.classList.add('hidden');
    }

    // Display detailed breakdown with highlights
    if (DOMElements.detailedBreakdown) {
        DOMElements.detailedBreakdown.innerHTML = analysis.words.map(w =>
            `<span class="${w.error ? 'highlight-' + w.error : 'highlight-correct'}">${w.word}</span>`
        ).join(' ');
    }

    // Display mispronounced words for practice with listen buttons
    // Filter specifically for 'mispronunciation' errors
    const mispronouncedWords = analysis.words
    .filter(w => w.error === 'mispronunciation' && typeof w.word === 'string' && w.word.trim() !== '')
    .map(w => w.word.trim());


    if (DOMElements.practiceSection && DOMElements.practiceWordsContainer) {
        if (mispronouncedWords.length > 0) {
            DOMElements.practiceSection.classList.remove('hidden');
            // Generate HTML for each mispronounced word with a listen button
            DOMElements.practiceWordsContainer.innerHTML = mispronouncedWords
        .map(word => `
            <button class="bg-orange-100 text-orange-800 rounded-full px-3 py-1 flex items-center space-x-1 listen-word-btn"
                    data-word="${word}">
                <span>${word}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-1.4-3.3.75.75 0 011.05-1.05A6 6 0 0118 12a6 6 0 01-1.85 4.35.75.75 0 11-1.05-1.05A4.5 4.5 0 0016.5 12zm3 0a7.5 7.5 0 00-2.25-5.3.75.75 0 111.05-1.05A9 9 0 0121 12a9 9 0 01-2.7 6.35.75.75 0 11-1.05-1.05A7.5 7.5 0 0019.5 12z"/>
                </svg>
            </button>
        `).join('');


            // Attach event listeners to the new buttons (delegation handled in patientManager.js)
        } else {
            DOMElements.practiceSection.classList.add('hidden');
        }
    }
    if (DOMElements.nextSentenceBtn) DOMElements.nextSentenceBtn.classList.remove('hidden');
}

/**
 * Launches a confetti animation for celebration.
 */
export function launchConfetti() {
    console.log("launchConfetti called.");
    if (!DOMElements.confettiContainer) {
        console.warn("Confetti container not found.");
        return;
    }
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        DOMElements.confettiContainer.appendChild(confetti);
        // Remove confetti after animation to prevent DOM clutter
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

/**
 * Renders or updates the patient's progress chart.
 * Aggregates data to show daily average scores.
 * @param {Array<Object>} data - An array of pronunciation history data.
 */
export function renderProgressChart(data) {
    console.log("renderProgressChart called with data:", data);
    // Robustly get the canvas element. If DOMElements.progressChart is null, try document.getElementById.
    let chartCanvas = DOMElements.progressChart;
    if (!chartCanvas) {
        chartCanvas = document.getElementById('progressChart');
        if (chartCanvas) {
            DOMElements.progressChart = chartCanvas; // Store for future use
        } else {
            console.error("Progress chart canvas not found. Ensure the element exists in the HTML.");
            return;
        }
    }
    const ctx = chartCanvas.getContext('2d');
    if (progressChartInstance) {
        progressChartInstance.destroy(); // Destroy previous chart instance
    }

    // Aggregate data by day
    const dailyScores = {}; // { 'YYYY-MM-DD': { sum: 0, count: 0 } }
    data.forEach(record => {
        if (record.timestamp) {
            const date = new Date(record.timestamp.toDate()).toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
            if (!dailyScores[date]) {
                dailyScores[date] = { sum: 0, count: 0 };
            }
            dailyScores[date].sum += record.overallScore;
            dailyScores[date].count++;
        }
    });

    const sortedDates = Object.keys(dailyScores).sort();
    const labels = sortedDates;
    const scores = sortedDates.map(date => (dailyScores[date].sum / dailyScores[date].count).toFixed(1)); // Average score

    // Access Chart globally
    progressChartInstance = new Chart(ctx, {
        type: 'line', // Changed to line chart for trends
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Daily Score', // Changed label
                data: scores,
                backgroundColor: 'rgba(59, 130, 246, 0.2)', // Fill color under the line
                borderColor: 'rgba(59, 130, 246, 1)', // Line color
                borderWidth: 2,
                tension: 0.3, // Smooth the line
                fill: true // Fill area under the line
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { // Y-axis title
                        display: true,
                        text: 'Score (%)'
                    }
                },
                x: {
                    title: { // X-axis title
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        autoSkip: false, // Prevent skipping labels
                        maxRotation: 90,  // Rotate labels up to 90 degrees
                        minRotation: 45   // Minimum rotation for readability
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true // Explicitly set to true
        }
    });
}

/**
 * Renders or updates the patient's daily practice sessions chart.
 * @param {Array<Object>} data - An array of pronunciation history data.
 */
export function renderDailySessionsChart(data) {
    console.log("renderDailySessionsChart called with data:", data);
    let chartCanvas = DOMElements.dailySessionsChart;
    if (!chartCanvas) {
        chartCanvas = document.getElementById('dailySessionsChart');
        if (chartCanvas) {
            DOMElements.dailySessionsChart = chartCanvas;
        } else {
            console.error("Daily sessions chart canvas not found.");
            return;
        }
    }
    const ctx = chartCanvas.getContext('2d');
    if (dailySessionsChartInstance) {
        dailySessionsChartInstance.destroy(); // Destroy previous chart instance
    }

    // Aggregate data to count sessions per day
    const dailySessionCounts = {}; // { 'YYYY-MM-DD': count }
    data.forEach(record => {
        if (record.timestamp) {
            const date = new Date(record.timestamp.toDate()).toLocaleDateString('en-CA');
            dailySessionCounts[date] = (dailySessionCounts[date] || 0) + 1;
        }
    });

    const sortedDates = Object.keys(dailySessionCounts).sort();
    const labels = sortedDates;
    const counts = sortedDates.map(date => dailySessionCounts[date]);

    dailySessionsChartInstance = new Chart(ctx, {
        type: 'bar', // Bar chart for counts
        data: {
            labels: labels,
            datasets: [{
                label: 'Sessions Completed',
                data: counts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0, // Ensure integer ticks for counts
                    title: {
                        display: true,
                        text: 'Number of Sessions'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 90,
                        minRotation: 45
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true
        }
    });
}


/**
 * Renders or updates the doctor's view of a patient's progress chart.
 * @param {Array<Object>} data - An array of pronunciation history data for the patient.
 */
export function renderDoctorPatientChart(data) { // Exported this function
    console.log("renderDoctorPatientChart called with data:", data);
    if (!DOMElements.doctorPatientChartCanvas) {
        console.error("Doctor patient chart canvas not found. Ensure DOMElements is initialized and the element exists.");
        return;
    }
    const ctx = DOMElements.doctorPatientChartCanvas.getContext('2d');
    if (doctorPatientChartInstance) {
        doctorPatientChartInstance.destroy(); // Destroy previous chart instance
    }

    // Aggregate data by day for the doctor's chart as well for consistency and clarity
    const dailyScores = {}; // { 'YYYY-MM-DD': { sum: 0, count: 0 } }
    data.forEach(record => {
        if (record.timestamp) {
            const date = new Date(record.timestamp.toDate()).toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
            if (!dailyScores[date]) {
                dailyScores[date] = { sum: 0, count: 0 };
            }
            dailyScores[date].sum += record.overallScore;
            dailyScores[date].count++;
        }
    });

    const sortedDates = Object.keys(dailyScores).sort();
    const labels = sortedDates;
    const scores = sortedDates.map(date => (dailyScores[date].sum / dailyScores[date].count).toFixed(1)); // Average score


    doctorPatientChartInstance = new Chart(ctx, {
        type: 'line', // Changed to line chart
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Daily Score', // Changed label
                data: scores,
                backgroundColor: 'rgba(59, 130, 246, 0.2)', // Fill color under the line
                borderColor: 'rgba(59, 130, 246, 1)', // Line color
                borderWidth: 2,
                tension: 0.3, // Smooth the line
                fill: true // Fill area under the line
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { // Y-axis title
                        display: true,
                        text: 'Score (%)'
                    }
                },
                x: {
                    title: { // X-axis title
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        autoSkip: false, // Prevent skipping labels
                        maxRotation: 90,  // Rotate labels up to 90 degrees
                        minRotation: 45   // Minimum rotation for readability
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true // Explicitly set to true
        }
    });
}

/**
 * Renders or updates the doctor's view of a patient's most challenging words.
 * @param {Array<Object>} data - An array of pronunciation history data for the patient.
 */
export function renderDoctorWordAccuracyChart(data) {
    console.log("renderDoctorWordAccuracyChart called with data:", data);
    let chartCanvas = DOMElements.doctorWordAccuracyChart;
    if (!chartCanvas) {
        chartCanvas = document.getElementById('doctorWordAccuracyChart');
        if (chartCanvas) {
            DOMElements.doctorWordAccuracyChart = chartCanvas;
        } else {
            console.error("Doctor word accuracy chart canvas not found.");
            return;
        }
    }
    const ctx = chartCanvas.getContext('2d');
    if (doctorWordAccuracyChartInstance) {
        doctorWordAccuracyChartInstance.destroy(); // Destroy previous chart instance
    }

    // Aggregate word-level errors
    const wordErrors = {}; // { 'word': { totalAttempts: 0, mispronunciations: 0 } }
    data.forEach(session => {
        if (session.wordDetails && Array.isArray(session.wordDetails)) {
            session.wordDetails.forEach(wordDetail => {
                // Defensive check: Ensure wordDetail and 'word' property exist
                if (wordDetail && wordDetail.word) { // CHANGED: Access wordDetail.word instead of wordDetail.originalWord
                    const word = wordDetail.word.toLowerCase(); // Use 'word' property for consistent key
                    if (!wordErrors[word]) {
                        wordErrors[word] = { totalAttempts: 0, mispronunciations: 0 };
                    }
                    // Only count target words towards total attempts and specific error types
                    // Insertions are not "attempts" of a target word, they are extra words.
                    // Assuming 'insertion' error type means it wasn't a target word.
                    if (wordDetail.error !== 'insertion') {
                        wordErrors[word].totalAttempts++;
                        if (wordDetail.error === 'mispronunciation' || wordDetail.error === 'omission' || wordDetail.error === 'clarity') {
                            wordErrors[word].mispronunciations++; // Count any error as a "mispronunciation" for this chart's purpose
                        }
                    }
                } else {
                    console.warn("Skipping malformed wordDetail:", wordDetail); // This is line 604
                }
            });
        }
    });

    // Calculate accuracy and filter for challenging words (e.g., accuracy < 100%)
    const challengingWords = [];
    for (const word in wordErrors) {
        const stats = wordErrors[word];
        // Calculate accuracy: (correct attempts / total attempts) * 100
        // Correct attempts are totalAttempts minus any errors (mispronunciations in this simplified context)
        const accuracy = stats.totalAttempts > 0 ? ((stats.totalAttempts - stats.mispronunciations) / stats.totalAttempts) * 100 : 100;

        // Only include words with less than 100% accuracy or those that had at least one error
        if (accuracy < 100 || stats.mispronunciations > 0) {
            challengingWords.push({ word: word, accuracy: accuracy, mispronunciations: stats.mispronunciations });
        }
    }

    // Sort by lowest accuracy, then by most mispronunciations, and take top N
    challengingWords.sort((a, b) => {
        if (a.accuracy !== b.accuracy) {
            return a.accuracy - b.accuracy; // Lower accuracy first
        }
        return b.mispronunciations - a.mispronunciations; // More mispronunciations first
    });

    const topWords = challengingWords.slice(0, 10); // Show top 10 most challenging words

    const labels = topWords.map(w => w.word);
    const accuracies = topWords.map(w => w.accuracy.toFixed(1));

    doctorWordAccuracyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy (%)',
                data: accuracies,
                backgroundColor: 'rgba(255, 99, 132, 0.6)', // Reddish color for challenging words
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar chart for better word display
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Word'
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true
        }
    });
}


/**
 * Updates the patient history list displayed on the UI.
 * @param {Array<Object>} historyData - An array of pronunciation history data.
 */
export function updateHistoryList(historyData) {
    console.log("updateHistoryList called with historyData:", historyData);
    let listHtml = '';
    if (historyData.length === 0) {
        listHtml = '<p class="text-gray-500">No practice history yet.</p>';
    } else {
        listHtml = historyData.map(data => { // Changed to map for cleaner code
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'N/A';
            return `
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="font-medium">${data.sentence} <span class="font-normal text-gray-600">- ${data.overallScore}%</span></p>
                    <p class="text-xs text-gray-500">${date}</p>
                </div>`;
        }).join('');
    }
    if (DOMElements.historyList) {
        DOMElements.historyList.innerHTML = listHtml;
    } else {
        console.error("historyList element not found.");
    }
}

/**
 * Renders the list of patients for the doctor's dashboard.
 * @param {Array<Object>} patients - An array of patient objects.
 * @param {function(string, string): void} onPatientClick - Callback when a patient is clicked.
 */
export function renderPatientList(patients, onPatientClick) { // Exported this function
    console.log("renderPatientList called with patients:", patients);
    let listHtml = '';
    if (patients.length === 0) {
        listHtml = '<p class="text-gray-500">No patients found.</p>';
    } else {
        listHtml = patients.map(patient => `
            <div class="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center shadow-sm">
                <div>
                    <p class="font-semibold text-gray-800">${patient.name}</p>
                    <p class="text-sm text-gray-500">ID: ${patient.id.substring(0, 8)}...</p>
                    <p class="text-sm text-gray-500">Last Activity: ${patient.lastActivity}</p>
                </div>
                <button data-patient-id="${patient.id}" data-patient-name="${patient.name}" class="view-patient-btn bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg">View</button>
            </div>
        `).join('');
    }
    if (DOMElements.patientList) {
        DOMElements.patientList.innerHTML = listHtml;
        // Add event listeners to the new buttons
        DOMElements.patientList.querySelectorAll('.view-patient-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const patientId = event.target.dataset.patientId;
                const patientName = event.target.dataset.patientName;
                if (onPatientClick) {
                    onPatientClick(patientId, patientName);
                }
            });
        });
    } else {
        console.error("patientList element not found.");
    }
}


/**
 * Updates the displayed user ID.
 * @param {string} userId - The user ID to display.
 */
export function updateUserIdDisplay(userId) {
    console.log("updateUserIdDisplay called with:", userId);
    if (DOMElements.userIdDisplay) {
        DOMElements.userIdDisplay.textContent = `User ID: ${userId}`;
    }
}

/**
 * Renders the list of feedback for the patient's view.
 * @param {Array<Object>} feedbackData - An array of feedback objects.
 */
export function renderPatientFeedbackList(feedbackData) { // NEW: Function for patient's feedback view
    console.log("renderPatientFeedbackList called with:", feedbackData);
    let listHtml = '';
    if (feedbackData.length === 0) {
        listHtml = '<p class="text-gray-500">No feedback from your doctor yet.</p>';
    } else {
        listHtml = feedbackData.map(feedback => {
            const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleDateString() : 'N/A';
            const doctorIdSnippet = feedback.doctorId ? feedback.doctorId.substring(0, 6) : 'N/A';
            // Add a class for unread feedback to potentially style it differently
            const unreadClass = feedback.read === false ? 'bg-blue-50 border-blue-400' : 'bg-yellow-50 border-yellow-400';
            return `
                <div class="${unreadClass} border-l-4 p-4 rounded-r-lg" data-feedback-id="${feedback.id}">
                    <p class="font-bold">Feedback from Doctor ${doctorIdSnippet}:</p>
                    <p class="text-gray-700">${feedback.feedbackText}</p>
                    <p class="text-xs text-gray-500 mt-1">${date}</p>
                </div>`;
        }).join('');
    }
    if (DOMElements.patientFeedbackList) { // Target the patient's feedback list
        DOMElements.patientFeedbackList.innerHTML = listHtml;
    } else {
        console.error("patientFeedbackList element not found.");
    }
}

/**
 * Renders the list of feedback for the doctor's view.
 * This function was previously named `renderPatientFeedbackList` but was intended for the doctor.
 * @param {Array<Object>} feedbackData - An array of feedback objects.
 */
export function renderDoctorPatientFeedbackList(feedbackData) { // Renamed for doctor's view
    console.log("renderDoctorPatientFeedbackList called with:", feedbackData);
    let listHtml = '';
    if (feedbackData.length === 0) {
        listHtml = '<p class="text-gray-500">No feedback from your doctor yet.</p>';
    } else {
        feedbackData.forEach(feedback => {
            const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleDateString() : 'N/A';
            const doctorIdSnippet = feedback.doctorId ? feedback.doctorId.substring(0, 6) : 'N/A';
            listHtml += `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                    <p class="font-bold">Feedback from Doctor ${doctorIdSnippet}:</p>
                    <p class="text-gray-700">${feedback.feedbackText}</p>
                    <p class="text-xs text-gray-500 mt-1">${date}</p>
                </div>`;
        });
    }
    if (DOMElements.doctorPatientFeedbackHistory) { // Use the doctor's specific element for feedback history
        DOMElements.doctorPatientFeedbackHistory.innerHTML = listHtml;
    } else {
        console.error("doctorPatientFeedbackHistory element not found.");
    }
}

/**
 * Renders the list of assigned exercises for a patient in the doctor's view.
 * @param {Array<Object>} exercisesData - An array of assigned exercise objects for the patient.
 */
export function renderDoctorAssignedExercisesHistory(exercisesData) {
    console.log("renderDoctorAssignedExercisesHistory called with:", exercisesData);
    if (!DOMElements.doctorAssignedExercisesHistory) {
        console.error("doctorAssignedExercisesHistory element not found. Ensure DOMElements is initialized and the element exists.");
        return;
    }
    let listHtml = '';
    if (exercisesData.length === 0) {
        listHtml = '<p class="text-gray-500">No exercises assigned to this patient yet.</p>';
    } else {
        listHtml = '<ul class="list-disc list-inside space-y-1">';
        exercisesData.forEach(exercise => {
            const assignedDate = exercise.assignedAt ? new Date(exercise.assignedAt.toDate()).toLocaleDateString() : 'N/A';
            const assignedBySnippet = exercise.assignedBy ? `by Doctor ${exercise.assignedBy.substring(0, 6)}...` : 'N/A';
            listHtml += `
                <li>
                    <span class="font-medium">${exercise.exerciseName}</span>
                    <span class="text-xs text-gray-500">(Assigned ${assignedBySnippet} on ${assignedDate})</span>
                </li>`;
        });
        listHtml += '</ul>';
    }
    DOMElements.doctorAssignedExercisesHistory.innerHTML = listHtml;
}

/**
 * Renders the list of assigned exercises for the patient's own view.
 * @param {Array<Object>} exercisesData - An array of assigned exercise objects for the patient.
 */
export function renderPatientAssignedExercises(exercisesData) {
    console.log("renderPatientAssignedExercises called with:", exercisesData);
    if (!DOMElements.patientAssignedExercises) {
        console.error("patientAssignedExercises element not found. Ensure DOMElements is initialized and the element exists.");
        return;
    }
    let listHtml = '';
    if (exercisesData.length === 0) {
        listHtml = '<p class="text-gray-500">No exercises assigned to you yet.</p>';
    } else {
        listHtml = '<ul class="list-disc list-inside space-y-1">';
        exercisesData.forEach(exercise => {
            const assignedDate = exercise.assignedAt ? new Date(exercise.assignedAt.toDate()).toLocaleDateString() : 'N/A';
            const assignedBySnippet = exercise.assignedBy ? `by Doctor ${exercise.assignedBy.substring(0, 6)}...` : 'N/A';
            listHtml += `
                <li>
                    <span class="font-medium">${exercise.exerciseName}</span>
                    <span class="text-xs text-gray-500">(Assigned ${assignedBySnippet} on ${assignedDate})</span>
                </li>`;
        });
        listHtml += '</ul>';
    }
    DOMElements.patientAssignedExercises.innerHTML = listHtml;
}


/**
 * Updates the latest practice session details in the doctor's view.
 * @param {Object|null} sessionData - The latest session data, or null if no sessions.
 */
export function updateDoctorLatestSessionDetails(sessionData) {
    console.log("updateDoctorLatestSessionDetails called with:", sessionData);
    if (DOMElements.doctorLatestSessionSentence && DOMElements.doctorLatestSessionScore && DOMElements.doctorLatestSessionAudio) {
        if (sessionData) {
            DOMElements.doctorLatestSessionSentence.textContent = `Sentence: "${sessionData.sentence || 'N/A'}"`;
            DOMElements.doctorLatestSessionScore.textContent = `Score: ${Math.round(sessionData.overallScore || 0)}%`;
            // For now, audio playback is hidden as audio blobs are not stored in Firestore directly.
            // If you implement Firebase Storage for audio, you would set the src here.
            DOMElements.doctorLatestSessionAudio.classList.add('hidden'); // Keep hidden
            // DOMElements.doctorLatestSessionAudio.src = sessionData.audioUrl || ''; // Uncomment if audioUrl is available
            // DOMEElements.doctorLatestSessionAudio.classList.remove('hidden'); // Uncomment if audio is available
        } else {
            DOMElements.doctorLatestSessionSentence.textContent = 'Sentence: No practice sessions yet.';
            DOMElements.doctorLatestSessionScore.textContent = 'Score: N/A';
            DOMElements.doctorLatestSessionAudio.classList.add('hidden');
        }
    }
}

/**
 * Updates the active patients, today's sessions, and alerts counts on the doctor dashboard.
 * @param {number} activePatients - The count of active patients.
 * @param {number} todaysSessions - The count of sessions today.
 * @param {number} alerts - The count of alerts (mock for now).
 */
export function updateDoctorDashboardStats(activePatients, todaysSessions, alerts) {
    console.log("Updating doctor dashboard stats:", { activePatients, todaysSessions, alerts });
    if (DOMElements.activePatientsCount) {
        DOMElements.activePatientsCount.textContent = activePatients;
    }
    if (DOMElements.todaysSessionsCount) {
        DOMElements.todaysSessionsCount.textContent = todaysSessions;
    }
    if (DOMElements.alertsCount) {
        DOMElements.alertsCount.textContent = alerts;
    }
}

/**
 * Updates the patient dashboard overview statistics.
 * @param {number} dailyGoalCompleted - Number of sentences completed today.
 * @param {number} dailyGoalTotal - Total daily goal sentences.
 * @param {number} practiceStreak - Current practice streak in days.
 * @param {number} newFeedbackCount - Number of new (unread) feedback messages.
 */
export function updatePatientDashboardStats(dailyGoalCompleted, dailyGoalTotal, practiceStreak, newFeedbackCount) {
    console.log("Updating patient dashboard stats:", { dailyGoalCompleted, dailyGoalTotal, practiceStreak, newFeedbackCount });
    if (DOMElements.dailyGoalSentences) {
        DOMElements.dailyGoalSentences.textContent = `${dailyGoalCompleted}/${dailyGoalTotal} Sentences`;
    }
    if (DOMElements.practiceStreakDays) {
        DOMElements.practiceStreakDays.textContent = `🔥 ${practiceStreak} Days`;
    }
    if (DOMElements.newFeedbackCount) {
        DOMElements.newFeedbackCount.textContent = newFeedbackCount;
    }
}


/**
 * Displays a temporary message for assignment actions.
 * @param {string} message - The message to display.
 * @param {boolean} isSuccess - True for success, false for error.
 */
export function displayAssignmentMessage(message, isSuccess) {
    const msgElement = DOMElements.assignmentMessage;
    if (msgElement) {
        msgElement.textContent = message;
        msgElement.classList.remove('hidden', 'text-green-600', 'text-red-600');
        if (isSuccess) {
            msgElement.classList.add('text-green-600');
        } else {
            msgElement.classList.add('text-red-600');
        }
        setTimeout(() => {
            msgElement.classList.add('hidden');
            msgElement.textContent = '';
        }, 3000); // Message disappears after 3 seconds
    }
}

/**
 * Displays a temporary message for export report actions.
 * @param {string} message - The message to display.
 * @param {boolean} isSuccess - True for success, false for error.
 */
export function displayExportReportMessage(message, isSuccess) {
    const msgElement = DOMElements.exportReportMessage;
    if (msgElement) {
        msgElement.textContent = message;
        msgElement.classList.remove('hidden', 'text-green-600', 'text-red-600');
        if (isSuccess) {
            msgElement.classList.add('text-green-600');
        } else {
            msgElement.classList.add('text-red-600');
        }
        setTimeout(() => {
            msgElement.classList.add('hidden');
            msgElement.textContent = '';
        }, 3000); // Message disappears after 3 seconds
    }
}


/**
 * Displays a temporary message for customize rubric actions.
 * @param {string} message - The message to display.
 * @param {boolean} isSuccess - True for success, false for error.
 */
export function displayCustomizeRubricMessage(message, isSuccess) {
    const msgElement = DOMElements.customizeRubricMessage;
    if (msgElement) {
        msgElement.textContent = message;
        msgElement.classList.remove('hidden', 'text-green-600', 'text-red-600');
        if (isSuccess) {
            msgElement.classList.add('text-green-600');
        } else {
            msgElement.classList.add('text-red-600');
        }
        setTimeout(() => {
            msgElement.classList.add('hidden');
            msgElement.textContent = '';
        }, 3000); // Message disappears after 3 seconds
    }
}

/**
 * Shows the rubric customization modal.
 */
export function showRubricModal() {
    console.log("showRubricModal called.");
    if (DOMElements.customizeRubricModal) {
        DOMElements.customizeRubricModal.classList.remove('hidden');
    }
}

/**
 * Hides the rubric customization modal.
 */
export function hideRubricModal() {
    console.log("hideRubricModal called.");
    if (DOMElements.customizeRubricModal) {
        DOMElements.customizeRubricModal.classList.add('hidden');
    }
}

/**
 * Updates the displayed value for a range input.
 * @param {HTMLElement} inputElement - The range input element.
 * @param {HTMLElement} valueElement - The span element to display the value.
 */
export function updateRangeValueDisplay(inputElement, valueElement) {
    if (inputElement && valueElement) {
        valueElement.textContent = `${inputElement.value}%`;
    }
}

/**
 * Shows the doctor dashboard view and hides other doctor views.
 */
export function showDoctorDashboardView() {
    console.log("showDoctorDashboardView called.");
    if (DOMElements.doctorDashboardView && DOMElements.patientDetailsView) {
        DOMElements.doctorDashboardView.classList.remove('hidden');
        DOMElements.patientDetailsView.classList.add('hidden');
    } else {
        console.error("Doctor dashboard or patient details view element not found.");
    }
}

/**
 * Shows the doctor patient details view and hides the dashboard view.
 * @param {string} patientName - The name of the patient to display in the details view.
 */
import { setupDoctorListeners } from './doctorManager.js';

export function showDoctorPatientDetailsView(patientName) {
    console.log("showDoctorPatientDetailsView called with patientName:", patientName);
    if (DOMElements.doctorDashboardView && DOMElements.patientDetailsView && DOMElements.patientDetailsName) {
        DOMElements.doctorDashboardView.classList.add('hidden');
        DOMElements.patientDetailsView.classList.remove('hidden');
        DOMElements.patientDetailsName.textContent = patientName;

    } else {
        console.error("Doctor dashboard, patient details view, or patient details name element not found.");
    }
}

