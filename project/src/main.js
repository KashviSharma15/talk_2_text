// src/main.js

/**
 * @fileoverview Main entry point for the Speech Therapy Platform application.
 * Handles initial Firebase setup, role selection, and delegates to
 * patient-specific or doctor-specific managers.
 */

import { initializeFirebase, waitForFirebaseAuthReady, getUserId } from './firebaseService.js';
import { initializePatientInterface, cleanupPatientListeners } from './patientManager.js'; // Updated import for patientManager
import { setupDoctorListeners, cleanupDoctorListeners, loadPatients } from './doctorManager.js';
import { DOMElements, showInterface, initializeDOMElements } from './uiManager.js'; // Import initializeDOMElements
import { initializeAsrModel } from './asrService.js'; // Import ASR model initializer

// Global variable to keep track of the current user role
let currentUserRole = null;

/**
 * Initializes the application when the window loads.
 * Sets up Firebase and initial UI.
 */
window.onload = async () => {
    console.log("Window loaded. Initializing DOM elements...");
    initializeDOMElements(); // NEW: Initialize DOM elements first!
    console.log("DOM elements initialized. Initializing Firebase...");

    // Attach static event listeners for role selection and logout buttons
    // These must be attached AFTER DOMElements are initialized
    if (DOMElements.patientBtn) {
        DOMElements.patientBtn.addEventListener('click', () => selectRole('patient'));
    }
    if (DOMElements.doctorBtn) {
        DOMElements.doctorBtn.addEventListener('click', () => selectRole('doctor'));
    }
    if (DOMElements.patientLogoutBtn) {
        DOMElements.patientLogoutBtn.addEventListener('click', () => logout());
    }
    if (DOMElements.doctorLogoutBtn) {
        DOMElements.doctorLogoutBtn.addEventListener('click', () => logout());
    }

    await initializeFirebase();
    console.log("Firebase initialization complete. Showing role selection interface.");
    showInterface('roleSelection'); // Always start with role selection

    // Initialize ASR model in the background after core app loads
    console.log("Initializing ASR model...");
    // Pass a dummy function for status update here, as main.js doesn't directly update ASR status
    await initializeAsrModel(() => {}); 
};

/**
 * Selects a user role and updates the UI accordingly.
 * @param {string} role - The selected role ('patient' or 'doctor').
 */
async function selectRole(role) {
    // Clean up previous role's listeners before setting new role
    if (currentUserRole === 'patient') { 
        cleanupPatientListeners();
    } else if (currentUserRole === 'doctor') {
        cleanupDoctorListeners();
    }

    currentUserRole = role; // Set new role
    console.log(`Role selected: ${role}`);

    // Wait for Firebase Auth to be fully ready before proceeding
    await waitForFirebaseAuthReady();
    const userId = getUserId();
    if (!userId) {
        console.error("User ID not available after Firebase auth ready. Cannot proceed with role selection.");
        // Use a custom modal or message box instead of alert
        // alert("Failed to authenticate with Firebase. Please try again.");
        return;
    }

    // Show the appropriate interface and set up listeners for the new role
    if (role === 'patient') {
        showInterface('patient');
        initializePatientInterface(); // Call the patient manager's initialization
    } else if (role === 'doctor') {
        showInterface('doctor');
        setupDoctorListeners(); // Set up doctor-specific listeners
        loadPatients(); // Load patients only when doctor view is active
    }
}

/**
 * Logs out the current user and returns to role selection.
 */
function logout() {
    console.log("Logging out...");
    // Perform any necessary cleanup for the current role before logging out
    if (currentUserRole === 'patient') {
        cleanupPatientListeners();
    } else if (currentUserRole === 'doctor') {
        cleanupDoctorListeners();
    }

    currentUserRole = null; // Reset role
    showInterface('roleSelection'); // Go back to role selection
    console.log("Logged out. Returned to role selection.");
}
