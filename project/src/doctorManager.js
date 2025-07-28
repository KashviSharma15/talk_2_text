// src/doctorManager.js

/**
 * @fileoverview Manages doctor-specific functionalities, including
 * fetching patient lists, displaying patient details, and handling
 * doctor-related UI interactions.
 */

import {
    DOMElements,
    showDoctorPatientDetailsView,
    showDoctorDashboardView,
    renderPatientList,
    renderDoctorPatientChart,
    renderDoctorWordAccuracyChart, // NEW: Import for doctor's word accuracy chart
    renderDoctorPatientFeedbackList, // Import for feedback list rendering for doctor's view
    renderDoctorAssignedExercisesHistory, // New: Import for rendering assigned exercises history
    updateDoctorLatestSessionDetails, // Import for updating latest session details
    displayAssignmentMessage, // Import for displaying assignment messages
    displayExportReportMessage, // Import for export report messages
    displayCustomizeRubricMessage, // Import for customize rubric messages
    showRubricModal, // Import for showing the rubric modal
    hideRubricModal, // Import for hiding the rubric modal
    updateRangeValueDisplay,
    updateDoctorDashboardStats // Import for updating dashboard stats
} from './uiManager.js';
import {
    fetchPatientsForDoctor,
    listenToPronunciationHistory, // Using listenToPronunciationHistory for patient history
    savePatientFeedback,
    listenToPatientFeedback,
    saveAssignedExercise,
    listenToAssignedExercises, // NEW: Import for listening to assigned exercises for doctor's view
    saveRubricSettings, // Import for saving rubric settings
    getRubricSettings, // Import for getting rubric settings
    fetchActivePatientsCount, // Import for active patients count
    fetchTodaysSessionsCount // Import for today's sessions count
} from './firebaseService.js';

let currentPatientHistoryUnsubscribe = null; // To manage the Firestore listener for the currently viewed patient's history
let currentPatientFeedbackUnsubscribe = null; // To manage the Firestore listener for the currently viewed patient's feedback
let currentPatientAssignedExercisesUnsubscribe = null; // NEW: To manage assigned exercises listener for doctor's view

let currentViewedPatientId = null; // Store the ID of the patient currently being viewed by the doctor
let currentPatientHistoryData = []; // Store the latest history data for the current patient
let currentPatientFeedbackData = []; // Store the latest feedback data for the current patient
let currentPatientName = ''; // Store the name of the patient currently being viewed

import { getUserId, getCurrentUserData } from './firebaseService.js';

/**
 * Loads the list of patients for the doctor's dashboard and updates dashboard stats.
 */
export async function loadPatients() {
    console.log("loadPatients called.");
    const doctorId = getUserId();
    if (!doctorId) {
        console.error("Doctor not authenticated. Cannot load patients.");
        return;
    }
    console.log("Doctor authenticated:", doctorId);

    // Optional: Display doctor info in UI
    const doctorData = getCurrentUserData();
    if (doctorData) {
        console.log(`Logged in as Dr. ${doctorData.name}`);
    }

    try {
        const patients = await fetchPatientsForDoctor();
        renderPatientList(patients, handlePatientViewClick);
        await updateDashboardStats();
    } catch (error) {
        console.error("Error loading patients:", error);
        if (DOMElements.patientList) {
            DOMElements.patientList.innerHTML = '<p class="text-red-500">Error loading patient list.</p>';
        }
    }
}


/**
 * Fetches and updates the dashboard statistics (active patients, today's sessions, alerts).
 */
async function updateDashboardStats() {
    console.log("Updating doctor dashboard statistics...");
    try {
        const activePatients = await fetchActivePatientsCount();
        const todaysSessions = await fetchTodaysSessionsCount();
        const alerts = Math.floor(Math.random() * 3); // Mock alerts for now (0-2 alerts)

        updateDoctorDashboardStats(activePatients, todaysSessions, alerts);
    } catch (error) {
        console.error("Error fetching dashboard statistics:", error);
        updateDoctorDashboardStats('N/A', 'N/A', 'N/A'); // Display N/A on error
    }
}


/**
 * Handles the click event for viewing a specific patient's details.
 * @param {string} patientId - The ID of the patient to view.
 * @param {string} patientName - The name of the patient to view.
 */
function handlePatientViewClick(patientId, patientName) {
    console.log("handlePatientViewClick called for patient:", patientId, patientName);
    currentViewedPatientId = patientId;
    currentPatientName = patientName;
    showDoctorPatientDetailsView(patientName);
    console.log(`[DoctorManager Debug] currentViewedPatientId set to: ${currentViewedPatientId}`);

    // Unsubscribe from previous listeners
    if (currentPatientHistoryUnsubscribe) {
        currentPatientHistoryUnsubscribe();
        console.log("Unsubscribed from previous patient history listener.");
    }
    if (currentPatientFeedbackUnsubscribe) {
        currentPatientFeedbackUnsubscribe();
        console.log("Unsubscribed from previous patient feedback listener.");
    }
    if (currentPatientAssignedExercisesUnsubscribe) {
        currentPatientAssignedExercisesUnsubscribe();
        console.log("Unsubscribed from previous patient assigned exercises listener.");
    }

    // 🔁 1. Pronunciation History Listener
    currentPatientHistoryUnsubscribe = listenToPronunciationHistory(currentViewedPatientId, (history) => {
        console.log("[DoctorManager Debug] Pronunciation history snapshot received:", history);
        currentPatientHistoryData = history; // ✅ Store for export

        renderDoctorPatientChart(history);
        renderDoctorWordAccuracyChart(history);

        const latestSession = history[0] || null;
        if (latestSession) {
            console.log("[DoctorManager Debug] Latest session data:", latestSession);
            updateDoctorLatestSessionDetails(latestSession);
        } else {
            console.log("[DoctorManager Debug] No latest session available.");
        }
    });

    // 🆕 2. Patient Feedback Listener
    currentPatientFeedbackUnsubscribe = listenToPatientFeedback(currentViewedPatientId, (feedback) => {
        console.log("[DoctorManager Debug] Feedback snapshot received:", feedback);
        currentPatientFeedbackData = feedback; // ✅ Store for export

        renderDoctorPatientFeedbackList(feedback);
    });

    // 🔁 3. Assigned Exercises Listener
    currentPatientAssignedExercisesUnsubscribe = listenToAssignedExercises(currentViewedPatientId, (exercises) => {
        console.log("[DoctorManager Debug] Assigned exercises snapshot received:", exercises);

        if (!exercises || exercises.length === 0) {
            console.warn("[DoctorManager Debug] No exercises assigned for patient:", currentViewedPatientId);
        }

        renderDoctorAssignedExercisesHistory(exercises);
    });
}


/**
 * Handles sending feedback from the doctor to the current patient.
 */
async function handleSendFeedback() {
    console.log(`[DoctorManager Debug] handleSendFeedback called. currentViewedPatientId: ${currentViewedPatientId}`);
    const feedbackTextarea = DOMElements.doctorFeedbackTextarea;
    const feedbackText = feedbackTextarea.value.trim();

    if (!feedbackText) {
        console.error('Please enter feedback before sending.');
        displayAssignmentMessage('Please enter feedback before sending.', false);
        return;
    }

    if (!currentViewedPatientId) {
        console.error("No patient selected to send feedback to.");
        displayAssignmentMessage('No patient selected. Please select a patient first.', false);
        return;
    }

    const doctorId = getUserId(); // Get the current doctor's ID
    if (!doctorId) {
        console.error("Doctor ID not available. Cannot send feedback.");
        displayAssignmentMessage('Could not identify doctor. Please try logging in again.', false);
        return;
    }

    try {
        await savePatientFeedback(currentViewedPatientId, feedbackText, doctorId);
        feedbackTextarea.value = ''; // Clear textarea after sending
        displayAssignmentMessage('Feedback sent successfully!', true);
    } catch (error) {
        console.error("Failed to send feedback:", error);
        displayAssignmentMessage('Failed to send feedback. Please try again.', false);
    }
}

/**
 * Handles the assignment of a new exercise to the current patient.
 */
async function handleAssignExercise() {
    const select = document.getElementById('assignExerciseSelect');
    const exercise = select?.value?.trim();

    if (!exercise) {
        alert("Please select an exercise to assign.");
        return;
    }

    try {
        console.log("[DoctorManager Debug] Assigning exercise to:", currentViewedPatientId);
        await saveAssignedExercise(currentViewedPatientId, exercise, getUserId());
        console.log("[DoctorManager Debug] Exercise successfully assigned!");
        select.value = ''; // Clear selected item
        displayAssignmentMessage("Exercise assigned successfully!", true);
    } catch (err) {
        console.error("[DoctorManager Error] Failed to assign exercise:", err);
        displayAssignmentMessage("Failed to assign exercise.", false);
    }
}

/**
 * Handles the export report action.
 */
function handleExportReport() {
    console.log(`[DoctorManager Debug] handleExportReport called. currentViewedPatientId: ${currentViewedPatientId}`);
    if (!currentViewedPatientId) {
        displayExportReportMessage('Please select a patient to export a report.', false);
        return;
    }

    if (!currentPatientHistoryData || !currentPatientFeedbackData) {
        displayExportReportMessage('No data available for this patient to generate a report.', false);
        return;
    }

    displayExportReportMessage('Generating report...', true);

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yOffset = 10;
        doc.setFontSize(22);
        doc.text(`Patient Report: ${currentPatientName}`, 10, yOffset);
        yOffset += 10;
        doc.setFontSize(12);
        doc.text(`Patient ID: ${currentViewedPatientId}`, 10, yOffset);
        yOffset += 15;

        const progressChartCanvas = DOMElements.doctorPatientChartCanvas;
        if (progressChartCanvas) {
            const imgData = progressChartCanvas.toDataURL('image/png');
            const imgWidth = 180;
            const imgHeight = (progressChartCanvas.height * imgWidth) / progressChartCanvas.width;
            if (yOffset + imgHeight + 10 > doc.internal.pageSize.height) {
                doc.addPage();
                yOffset = 10;
            }
            doc.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 10;
        }

        const wordAccuracyChartCanvas = DOMElements.doctorWordAccuracyChart;
        if (wordAccuracyChartCanvas) {
            const imgDataWordAccuracy = wordAccuracyChartCanvas.toDataURL('image/png');
            const imgWidthWordAccuracy = 180;
            const imgHeightWordAccuracy = (wordAccuracyChartCanvas.height * imgWidthWordAccuracy) / wordAccuracyChartCanvas.width;
            if (yOffset + imgHeightWordAccuracy + 10 > doc.internal.pageSize.height) {
                doc.addPage();
                yOffset = 10;
            }
            doc.addImage(imgDataWordAccuracy, 'PNG', 10, yOffset, imgWidthWordAccuracy, imgHeightWordAccuracy);
            yOffset += imgHeightWordAccuracy + 10;
        }

        doc.setFontSize(16);
        doc.text('Pronunciation History', 10, yOffset);
        yOffset += 10;
        doc.setFontSize(10);
        if (currentPatientHistoryData.length > 0) {
            currentPatientHistoryData.forEach((record, index) => {
                const date = record.timestamp ? new Date(record.timestamp.toDate()).toLocaleDateString() : 'N/A';
                const line = `Session ${index + 1}: \"${record.sentence}\" - Score: ${record.overallScore}% (${date})`;
                if (yOffset + 5 > doc.internal.pageSize.height - 10) {
                    doc.addPage();
                    yOffset = 10;
                }
                doc.text(line, 15, yOffset);
                yOffset += 7;
            });
        } else {
            doc.text('No pronunciation history available.', 15, yOffset);
            yOffset += 7;
        }
        yOffset += 10;

        doc.setFontSize(16);
        doc.text('Doctor Feedback History', 10, yOffset);
        yOffset += 10;
        doc.setFontSize(10);
        if (currentPatientFeedbackData.length > 0) {
            currentPatientFeedbackData.forEach((feedback, index) => {
                const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleDateString() : 'N/A';
                const doctorIdSnippet = feedback.doctorId ? feedback.doctorId.substring(0, 6) : 'N/A';
                const line1 = `Feedback ${index + 1} from Doctor ${doctorIdSnippet} (${date}):`;
                const line2 = `   \"${feedback.feedbackText}\"`;

                if (yOffset + 12 > doc.internal.pageSize.height - 10) {
                    doc.addPage();
                    yOffset = 10;
                }
                doc.text(line1, 15, yOffset);
                yOffset += 5;
                doc.text(line2, 15, yOffset);
                yOffset += 7;
            });
        } else {
            doc.text('No feedback history available.', 15, yOffset);
            yOffset += 7;
        }
        yOffset += 10;

        doc.save(`Patient_Report_${currentPatientName.replace(/\s/g, '_')}_${currentViewedPatientId.substring(0, 6)}.pdf`);
        displayExportReportMessage('Report generated successfully!', true);

    } catch (error) {
        console.error("Error generating PDF report:", error);
        displayExportReportMessage('Failed to generate report. Please try again.', false);
    }
}


/**
 * Handles the customize scoring rubric action.
 */
async function handleCustomizeScoringRubric() {
    console.log(`[DoctorManager Debug] handleCustomizeScoringRubric called.`);
    showRubricModal();

    const doctorId = getUserId();
    if (doctorId) {
        const settings = await getRubricSettings(doctorId);
        if (settings) {
            DOMElements.mispronunciationWeight.value = settings.mispronunciationWeight ?? 50;
            DOMElements.omissionWeight.value = settings.omissionWeight ?? 70;
            DOMElements.insertionWeight.value = settings.insertionWeight ?? 30;
        } else {
            console.warn("No custom rubric settings found for doctor:", doctorId);
            DOMElements.mispronunciationWeight.value = 50;
            DOMElements.omissionWeight.value = 70;
            DOMElements.insertionWeight.value = 30;
        }
    } else {
        console.error("Doctor ID not found");
    }

    updateRangeValueDisplay(DOMElements.mispronunciationWeight, DOMElements.mispronunciationWeightValue);
    updateRangeValueDisplay(DOMElements.omissionWeight, DOMElements.omissionWeightValue);
    updateRangeValueDisplay(DOMElements.insertionWeight, DOMElements.insertionWeightValue);
}


/**
 * Handles saving the customized rubric settings.
 */
async function handleSaveRubric() {
    console.log(`[DoctorManager Debug] handleSaveRubric called.`);
    const doctorId = getUserId();
    if (!doctorId) {
        DOMElements.rubricMessage.textContent = 'Could not identify doctor. Please log in again.';
        DOMElements.rubricMessage.classList.remove('hidden', 'text-green-600');
        DOMElements.rubricMessage.classList.add('text-red-600');
        setTimeout(() => {
            DOMElements.rubricMessage.classList.add('hidden');
            DOMElements.rubricMessage.textContent = '';
        }, 3000);
        return;
    }

    const rubricSettings = {
        mispronunciationWeight: parseInt(DOMElements.mispronunciationWeight.value),
        omissionWeight: parseInt(DOMElements.omissionWeight.value),
        insertionWeight: parseInt(DOMElements.insertionWeight.value),
        // Removed clarityThreshold from settings to be saved
        clarityThreshold: parseInt(DOMElements.clarityThreshold.value)
    };

    try {
        await saveRubricSettings(doctorId, rubricSettings);
        DOMElements.rubricMessage.textContent = 'Rubric settings saved successfully!';
        DOMElements.rubricMessage.classList.remove('hidden', 'text-red-600');
        DOMElements.rubricMessage.classList.add('text-green-600');
        setTimeout(() => {
            DOMElements.rubricMessage.classList.add('hidden');
            DOMElements.rubricMessage.textContent = '';
            hideRubricModal(); // Hide modal on success
        }, 2000); // Message disappears after 2 seconds, then modal hides
    } catch (error) {
        console.error("Error saving rubric settings:", error);
        DOMElements.rubricMessage.textContent = 'Failed to save rubric settings. Please try again.';
        DOMElements.rubricMessage.classList.remove('hidden', 'text-green-600');
        DOMElements.rubricMessage.classList.add('text-red-600');
        setTimeout(() => {
            DOMElements.rubricMessage.classList.add('hidden');
            DOMElements.rubricMessage.textContent = '';
        }, 3000); // Message disappears after 3 seconds
    }
}


/**
 * Sets up doctor-specific event listeners for navigation and actions.
 */
// Rewritten setupDoctorListeners using event delegation

let doctorListenersInitialized = false;

export function setupDoctorListeners() {
    if (doctorListenersInitialized) return;
    doctorListenersInitialized = true;
    console.log("[DoctorManager Debug] Setting up delegated listeners");

    document.addEventListener('click', (e) => {
        const target = e.target;

        if (target.matches('#assignExerciseBtn')) {
            console.log("[DoctorManager Debug] Assign button clicked");
            handleAssignExercise();
        }

        if (target.matches('#exportReportBtn')) {
            console.log("[DoctorManager Debug] Export PDF button clicked");
            handleExportReport();
        }

        if (target.matches('#customizeRubricBtn')) {
            console.log("[DoctorManager Debug] Customize rubric clicked");
            handleCustomizeScoringRubric();
        }

        if (target.matches('#cancelRubricBtn')) {
            hideRubricModal();
        }

        if (target.matches('#saveRubricBtn')) {
            handleSaveRubric();
        }
    });

    // Rubric slider updates using event delegation
    document.addEventListener('input', (e) => {
        const input = e.target;
        if (input.matches('#mispronunciationWeight, #omissionWeight, #insertionWeight, #clarityThreshold')) {
            const valueElementId = input.id + 'Value';
            const valueElement = document.getElementById(valueElementId);
            if (valueElement) {
                updateRangeValueDisplay(input, valueElement);
            }
        }
    });

    // Back button and feedback button
    document.addEventListener('click', (e) => {
        if (e.target.matches('#backToPatientListBtn')) {
            handleBackToPatientListClick();
        }
        if (e.target.matches('#sendFeedbackBtn')) {
            handleSendFeedback();
        }
    });
}


/**
 * Handles the click event for the "Back to Patient List" button.
 */
function handleBackToPatientListClick() {
    console.log("Back to Patient List button clicked.");
    showDoctorDashboardView();
    // Unsubscribe from current patient's history when going back to list
    if (currentPatientHistoryUnsubscribe) {
        currentPatientHistoryUnsubscribe();
        currentPatientHistoryUnsubscribe = null;
        console.log("Unsubscribed from current patient history listener when returning to dashboard.");
    }
    // Unsubscribe from current patient's feedback when going back to list
    if (currentPatientFeedbackUnsubscribe) {
        currentPatientFeedbackUnsubscribe();
        currentPatientFeedbackUnsubscribe = null;
        console.log("Unsubscribed from current patient feedback listener when returning to dashboard.");
    }
    // NEW: Unsubscribe from current patient's assigned exercises listener
    if (currentPatientAssignedExercisesUnsubscribe) {
        currentPatientAssignedExercisesUnsubscribe();
        currentPatientAssignedExercisesUnsubscribe = null;
        console.log("Unsubscribed from current patient assigned exercises listener when returning to dashboard.");
    }

    currentViewedPatientId = null; // Clear the current patient ID
    currentPatientName = ''; // Clear patient name
    currentPatientHistoryData = []; // Clear history data
    currentPatientFeedbackData = []; // Clear feedback data
    // Clear latest session details when navigating away
    updateDoctorLatestSessionDetails(null);

    // Refresh dashboard stats when returning to the dashboard view
    updateDashboardStats();
}


/**
 * Cleans up doctor-specific listeners and state when logging out or switching roles.
 */
export function cleanupDoctorListeners() {
    console.log("Cleaning up doctor listeners.");
    // Remove specific event listeners if they were attached
    if (DOMElements.sendFeedbackBtn) {
        DOMElements.sendFeedbackBtn.removeEventListener('click', handleSendFeedback);
    }
    if (DOMElements.assignExerciseBtn) {
        DOMElements.assignExerciseBtn.removeEventListener('click', handleAssignExercise);
    }
    if (DOMElements.exportReportBtn) {
        DOMElements.exportReportBtn.removeEventListener('click', handleExportReport);
    }
    if (DOMElements.customizeRubricBtn) {
        DOMElements.customizeRubricBtn.removeEventListener('click', handleCustomizeScoringRubric);
    }
    if (DOMElements.cancelRubricBtn) {
        DOMElements.cancelRubricBtn.removeEventListener('click', hideRubricModal);
    }
    if (DOMElements.saveRubricBtn) {
        DOMElements.saveRubricBtn.removeEventListener('click', handleSaveRubric);
    }
    // Define handleRubricRangeInput locally for cleanup scope if it's not global
    function handleRubricRangeInput(event) {
        const inputElement = event.target;
        const valueElementId = inputElement.id + 'Value';
        const valueElement = DOMElements[valueElementId];
        updateRangeValueDisplay(inputElement, valueElement);
    }
    if (DOMElements.mispronunciationWeight) {
        DOMElements.mispronunciationWeight.removeEventListener('input', handleRubricRangeInput);
    }
    if (DOMElements.omissionWeight) {
        DOMElements.omissionWeight.removeEventListener('input', handleRubricRangeInput);
    }
    if (DOMElements.insertionWeight) {
        DOMElements.insertionWeight.removeEventListener('input', handleRubricRangeInput);
    }
    // Removed clarityThreshold listener
    if (DOMElements.clarityThreshold) {
        DOMElements.clarityThreshold.removeEventListener('input', handleRubricRangeInput);
    }

    if (DOMElements.backToPatientListBtn) { // Check if element exists before removing listener
        DOMElements.backToPatientListBtn.removeEventListener('click', handleBackToPatientListClick);
    }

    // Unsubscribe from any active Firestore listeners
    if (currentPatientHistoryUnsubscribe) {
        currentPatientHistoryUnsubscribe();
        currentPatientHistoryUnsubscribe = null;
        console.log("Unsubscribed from current patient history listener during cleanup.");
    }
    if (currentPatientFeedbackUnsubscribe) {
        currentPatientFeedbackUnsubscribe();
        currentPatientFeedbackUnsubscribe = null;
        console.log("Unsubscribed from current patient feedback listener during cleanup.");
    }
    // NEW: Unsubscribe from current patient's assigned exercises listener
    if (currentPatientAssignedExercisesUnsubscribe) {
        currentPatientAssignedExercisesUnsubscribe();
        currentPatientAssignedExercisesUnsubscribe = null;
        console.log("Unsubscribed from current patient assigned exercises listener when returning to dashboard.");
    }

    currentViewedPatientId = null; // Clear the current patient ID
    currentPatientName = ''; // Clear patient name
    currentPatientHistoryData = []; // Clear history data
    currentPatientFeedbackData = []; // Clear feedback data
    // Clear latest session details when navigating away
    updateDoctorLatestSessionDetails(null);
}
