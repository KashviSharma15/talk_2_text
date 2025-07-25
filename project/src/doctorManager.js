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
    renderDoctorPatientFeedbackList,
    renderDoctorAssignedExercisesHistory,
    updateDoctorLatestSessionDetails,
    displayAssignmentMessage,
    displayExportReportMessage,
    displayCustomizeRubricMessage,
    showRubricModal,
    hideRubricModal,
    updateRangeValueDisplay,
    updateDoctorDashboardStats // NEW: Import for updating dashboard stats
} from './uiManager.js';
import {
    fetchPatientsForDoctor,
    listenToPronunciationHistory,
    savePatientFeedback,
    listenToPatientFeedback,
    getUserId,
    saveAssignedExercise,
    listenToAssignedExercises,
    saveRubricSettings,
    getRubricSettings,
    fetchActivePatientsCount, // NEW: Import for active patients count
    fetchTodaysSessionsCount // NEW: Import for today's sessions count
} from './firebaseService.js';

let currentPatientHistoryUnsubscribe = null; // To manage the Firestore listener for the currently viewed patient's history
let currentPatientFeedbackUnsubscribe = null; // To manage the Firestore listener for the currently viewed patient's feedback
let currentPatientAssignedExercisesUnsubscribe = null; // To manage assigned exercises listener for doctor's view

let currentViewedPatientId = null; // Store the ID of the patient currently being viewed by the doctor
let currentPatientHistoryData = []; // Store the latest history data for the current patient
let currentPatientFeedbackData = []; // Store the latest feedback data for the current patient
let currentPatientName = ''; // Store the name of the patient currently being viewed

/**
 * Loads the list of patients for the doctor's dashboard and updates dashboard stats.
 */
export async function loadPatients() {
    console.log("loadPatients called.");
    try {
        const patients = await fetchPatientsForDoctor();
        renderPatientList(patients, handlePatientViewClick);
        await updateDashboardStats(); // Update dashboard stats when patients are loaded
    } catch (error) {
        console.error("Error loading patients:", error);
        // Optionally, display an error message in the UI
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
    currentViewedPatientId = patientId; // Store the current patient ID
    currentPatientName = patientName; // Store the current patient name
    showDoctorPatientDetailsView(patientName);
    console.log(`[DoctorManager Debug] currentViewedPatientId set to: ${currentViewedPatientId}`);

    // Unsubscribe from previous patient's history listener if active
    if (currentPatientHistoryUnsubscribe) {
        currentPatientHistoryUnsubscribe();
        console.log("Unsubscribed from previous patient history listener.");
    }
    // Unsubscribe from previous patient's feedback listener if active
    if (currentPatientFeedbackUnsubscribe) {
        currentPatientFeedbackUnsubscribe();
        console.log("Unsubscribed from previous patient feedback listener.");
    }
    // Unsubscribe from previous patient's assigned exercises listener if active
    if (currentPatientAssignedExercisesUnsubscribe) {
        currentPatientAssignedExercisesUnsubscribe();
        console.log("Unsubscribed from previous patient assigned exercises listener.");
    }

    // Set up a new real-time listener for the selected patient's history
    currentPatientHistoryUnsubscribe = listenToPronunciationHistory(patientId, (historyData) => {
        console.log(`[DoctorManager Debug] Received history data for patient ${patientId}:`, historyData);
        currentPatientHistoryData = historyData; // Store the history data
        // Render the chart for the specific patient
        renderDoctorPatientChart(historyData);

        // Update latest session details - historyData is already sorted by desc timestamp
        const latestSession = historyData.length > 0 ? historyData[0] : null;
        updateDoctorLatestSessionDetails(latestSession);
    });

    // Set up a new real-time listener for the selected patient's feedback
    currentPatientFeedbackUnsubscribe = listenToPatientFeedback(patientId, (feedbackData) => {
        console.log(`[DoctorManager Debug] Received feedback data for patient ${patientId}:`, feedbackData);
        currentPatientFeedbackData = feedbackData; // Store the feedback data
        renderDoctorPatientFeedbackList(feedbackData); // Render feedback in the doctor's view
    });

    // Set up a real-time listener for the selected patient's assigned exercises history
    currentPatientAssignedExercisesUnsubscribe = listenToAssignedExercises(patientId, (exercisesData) => {
        console.log(`[DoctorManager Debug] Received assigned exercises data for patient ${patientId}:`, exercisesData);
        renderDoctorAssignedExercisesHistory(exercisesData); // Render assigned exercises history in the doctor's view
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
    console.log(`[DoctorManager Debug] handleAssignExercise called. currentViewedPatientId: ${currentViewedPatientId}`);
    if (!currentViewedPatientId) {
        displayAssignmentMessage('Please select a patient before assigning an exercise.', false);
        return;
    }
    const selectedExercise = DOMElements.assignExerciseSelect.value;
    const doctorId = getUserId();

    if (!doctorId) {
        console.error("Doctor ID not available. Cannot assign exercise.");
        displayAssignmentMessage('Could not identify doctor. Please try logging in again.', false);
        return;
    }

    try {
        await saveAssignedExercise(currentViewedPatientId, selectedExercise, doctorId);
        displayAssignmentMessage(`Exercise "${selectedExercise}" assigned to Patient ${currentViewedPatientId.substring(0, 6)}!`, true);
    } catch (error) {
        console.error("Error assigning exercise:", error);
        displayAssignmentMessage('Failed to assign exercise. Please try again.', false);
    }
}

/**
 * Handles the export report action.
 */
async function handleExportReport() {
    console.log(`[DoctorManager Debug] handleExportReport called. currentViewedPatientId: ${currentViewedPatientId}`);
    if (!currentViewedPatientId) {
        displayExportReportMessage('Please select a patient to export a report.', false);
        return;
    }
    // For now, assuming currentPatientHistoryData and currentPatientFeedbackData are up-to-date
    // (They are kept updated by the listeners in handlePatientViewClick)

    if (currentPatientHistoryData.length === 0 && currentPatientFeedbackData.length === 0) {
        displayExportReportMessage('No data available for this patient to generate a report.', false);
        return;
    }

    displayExportReportMessage('Generating report...', true);

    try {
        // Ensure jsPDF is available globally
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yOffset = 10; // Initial Y position for content

        // Add Title
        doc.setFontSize(22);
        doc.text(`Patient Report: ${currentPatientName}`, 10, yOffset);
        yOffset += 10;
        doc.setFontSize(12);
        doc.text(`Patient ID: ${currentViewedPatientId}`, 10, yOffset);
        yOffset += 15;

        // --- Chart/Graph Inclusion ---
        const chartCanvas = DOMElements.doctorPatientChartCanvas;
        if (chartCanvas) {
            // Ensure the chart is rendered before attempting to convert it to an image
            const imgData = chartCanvas.toDataURL('image/png');
            const imgWidth = 180; // Standard width for A4 page, adjust as needed
            const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width; // Maintain aspect ratio

            // Check if adding the chart will exceed page height, add new page if necessary
            if (yOffset + imgHeight + 10 > doc.internal.pageSize.height) {
                doc.addPage();
                yOffset = 10;
            }
            doc.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 10; // Move yOffset down after adding the image
        }
        // ------------------------------------------

        // Add Patient History
        doc.setFontSize(16);
        doc.text('Pronunciation History', 10, yOffset);
        yOffset += 10;
        doc.setFontSize(10);
        if (currentPatientHistoryData.length > 0) {
            currentPatientHistoryData.forEach((record, index) => {
                const date = record.timestamp ? new Date(record.timestamp.toDate()).toLocaleDateString() : 'N/A';
                const line = `Session ${index + 1}: "${record.sentence}" - Score: ${record.overallScore}% (${date})`;
                if (yOffset + 5 > doc.internal.pageSize.height - 10) { // Check for page break
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

        // Add Patient Feedback
        doc.setFontSize(16);
        doc.text('Doctor Feedback History', 10, yOffset);
        yOffset += 10;
        doc.setFontSize(10);
        if (currentPatientFeedbackData.length > 0) {
            currentPatientFeedbackData.forEach((feedback, index) => {
                const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleDateString() : 'N/A';
                const doctorIdSnippet = feedback.doctorId ? feedback.doctorId.substring(0, 6) : 'N/A';
                const line1 = `Feedback ${index + 1} from Doctor ${doctorIdSnippet} (${date}):`;
                const line2 = `   "${feedback.feedbackText}"`;

                if (yOffset + 12 > doc.internal.pageSize.height - 10) { // Check for page break
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

        // Save the PDF
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
    showRubricModal(); // Show the rubric modal
    // Load existing settings when the modal opens
    const doctorId = getUserId();
    if (doctorId) {
        const settings = await getRubricSettings(doctorId);
        if (settings) {
            DOMElements.mispronunciationWeight.value = settings.mispronunciationWeight || 50;
            DOMElements.omissionWeight.value = settings.omissionWeight || 70;
            DOMElements.insertionWeight.value = settings.insertionWeight || 30;
            // Removed clarityThreshold as it's not supported by in-browser Whisper
            // DOMElements.clarityThreshold.value = settings.clarityThreshold || 75;
        }
    }
    // Update display values initially
    updateRangeValueDisplay(DOMElements.mispronunciationWeight, DOMElements.mispronunciationWeightValue);
    updateRangeValueDisplay(DOMElements.omissionWeight, DOMElements.omissionWeightValue);
    updateRangeValueDisplay(DOMElements.insertionWeight, DOMElements.insertionWeightValue);
    // Removed clarityThreshold display update
    // updateRangeValueDisplay(DOMElements.clarityThreshold, DOMElements.clarityThresholdValue);
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
        // clarityThreshold: parseInt(DOMElements.clarityThreshold.value)
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
export function setupDoctorListeners() {
    console.log("setupDoctorListeners called.");
    // Remove existing listeners first to prevent duplicates
    // Check if elements exist before removing listeners
    if (DOMElements.backToPatientListBtn) {
        DOMElements.backToPatientListBtn.removeEventListener('click', handleBackToPatientListClick);
    }
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
    // Generic handler for all range inputs (needs to be defined for removal)
    function handleRubricRangeInput(event) {
        const inputElement = event.target;
        const valueElementId = inputElement.id + 'Value';
        const valueElement = DOMElements[valueElementId]; // Access from DOMElements map
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


    // Add new listeners
    if (DOMElements.backToPatientListBtn) {
        DOMElements.backToPatientListBtn.addEventListener('click', handleBackToPatientListClick);
    }

    if (DOMElements.sendFeedbackBtn) {
        DOMElements.sendFeedbackBtn.addEventListener('click', handleSendFeedback);
    } else {
        console.warn("Send Feedback button not found in DOM. Please ensure its ID is 'sendFeedbackBtn'.");
    }

    if (DOMElements.assignExerciseBtn) {
        DOMElements.assignExerciseBtn.addEventListener('click', handleAssignExercise);
    }
    if (DOMElements.exportReportBtn) {
        DOMElements.exportReportBtn.addEventListener('click', handleExportReport);
    }
    if (DOMElements.customizeRubricBtn) {
        DOMElements.customizeRubricBtn.addEventListener('click', handleCustomizeScoringRubric);
    }

    // Rubric Modal Listeners
    if (DOMElements.cancelRubricBtn) {
        DOMElements.cancelRubricBtn.addEventListener('click', hideRubricModal);
    }
    if (DOMElements.saveRubricBtn) {
        DOMElements.saveRubricBtn.addEventListener('click', handleSaveRubric);
    }
    // Re-add generic handler for all range inputs
    if (DOMElements.mispronunciationWeight) {
        DOMElements.mispronunciationWeight.addEventListener('input', handleRubricRangeInput);
    }
    if (DOMElements.omissionWeight) {
        DOMElements.omissionWeight.addEventListener('input', handleRubricRangeInput);
    }
    if (DOMElements.insertionWeight) {
        DOMElements.insertionWeight.addEventListener('input', handleRubricRangeInput);
    }
    // Removed clarityThreshold listener
    if (DOMElements.clarityThreshold) {
        DOMElements.clarityThreshold.addEventListener('input', handleRubricRangeInput);
    }
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
    // Unsubscribe from current patient's assigned exercises listener
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
