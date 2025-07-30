// src/main.js

import {
    initializeFirebase,
    waitForFirebaseAuthReady,
    loginUser,
    registerUser,
    logoutUser,
    getUserRole,
    getUserId,
    getCurrentUserData
} from './firebaseService.js';
import { initializePatientInterface, cleanupPatientListeners } from './patientManager.js';
import { setupDoctorListeners, cleanupDoctorListeners, loadPatients } from './doctorManager.js';
import { DOMElements, showInterface, initializeDOMElements, updateUserInfo } from './uiManager.js';
import { initializeAsrModel } from './asrService.js';

let currentUserRole = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing DOM...");
    initializeDOMElements();

    const params = new URLSearchParams(window.location.search);
    const autoLogin = params.get('showLogin');

    attachAuthEventListeners();
    setupRoleToggle(); // ✅ NEW: Enable patient/doctor registration field toggle

    console.log("Initializing Firebase...");
    await initializeFirebase();
    await waitForFirebaseAuthReady();

    const uid = getUserId();
    if (uid) {
        console.log("User already signed in:", uid);
        const role = await getUserRole(uid);
        const userData = getCurrentUserData();
        if (role) {
            updateUserInfo(userData?.name || "User", uid);
            redirectToDashboard(role);
        } else {
            showInterface('login');
        }
    } else {
        console.log("No user signed in. Showing login...");
        showInterface('login');
    }

    console.log("Initializing ASR model...");
    await initializeAsrModel(() => {});
});

/**
 * Attach login/register/logout listeners
 */
function attachAuthEventListeners() {
    // Switch between login/register modals
    DOMElements.showRegisterFromLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showInterface('register');
    });

    DOMElements.showLoginFromRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showInterface('login');
    });

    // Handle login
    DOMElements.loginSubmitBtn.addEventListener('click', async () => {
        const email = DOMElements.loginEmail.value.trim();
        const password = DOMElements.loginPassword.value.trim();
        try {
            await loginUser(email, password);
            const uid = getUserId();
            const role = await getUserRole(uid);
            const userData = getCurrentUserData();
            updateUserInfo(userData?.name || "User", uid);
            redirectToDashboard(role);
        } catch (err) {
            console.error("Login failed:", err);
            DOMElements.loginMessage.textContent = "Invalid email or password.";
            DOMElements.loginMessage.classList.remove('hidden');
        }
    });

    // Handle registration
    DOMElements.registerSubmitBtn.addEventListener('click', async () => {
        const fullName = DOMElements.registerFullName.value.trim();
        const email = DOMElements.registerEmail.value.trim();
        const password = DOMElements.registerPassword.value.trim();
        const role = document.querySelector('input[name="roleSelect"]:checked')?.value;

        const extraData = {};

        // Role-specific fields
        if (role === 'patient') {
            extraData.age = DOMElements.registerAge.value.trim();
            extraData.gender = document.querySelector('input[name="genderSelect"]:checked')?.value;
        } else if (role === 'doctor') {
            extraData.specialty = DOMElements.registerSpecialty.value.trim();
        }

        // Validation
        if (!fullName || !email || !password || !role ||
            (role === 'patient' && (!extraData.age || !extraData.gender)) ||
            (role === 'doctor' && !extraData.specialty)) {
            DOMElements.registerMessage.textContent = "All fields are required.";
            DOMElements.registerMessage.classList.remove('hidden');
            return;
        }

        try {
            await registerUser(email, password, fullName, role, extraData);
            const uid = getUserId();
            updateUserInfo(fullName, uid);
            redirectToDashboard(role);
        } catch (err) {
            console.error("Registration failed:", err);
            DOMElements.registerMessage.textContent = "Registration failed. Try again.";
            DOMElements.registerMessage.classList.remove('hidden');
        }
    });

    // Logout buttons
    if (DOMElements.patientLogoutBtn) {
        DOMElements.patientLogoutBtn.addEventListener('click', handleLogout);
    }
    if (DOMElements.doctorLogoutBtn) {
        DOMElements.doctorLogoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * ✅ NEW: Toggle patient/doctor registration fields dynamically
 */
function setupRoleToggle() {
    const roleRadios = document.querySelectorAll('input[name="roleSelect"]');
    const patientFields = document.getElementById('patientFields');
    const doctorFields = document.getElementById('doctorFields');

    roleRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'patient') {
                patientFields.classList.remove('hidden');
                doctorFields.classList.add('hidden');
            } else if (radio.value === 'doctor') {
                doctorFields.classList.remove('hidden');
                patientFields.classList.add('hidden');
            }
        });
    });
}

/**
 * Redirects user based on their role
 */
function redirectToDashboard(role) {
    currentUserRole = role;
    if (role === 'patient') {
        showInterface('patient');
        initializePatientInterface();
    } else if (role === 'doctor') {
        showInterface('doctor');
        setupDoctorListeners();
        loadPatients();
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    console.log("Logging out...");
    if (currentUserRole === 'patient') cleanupPatientListeners();
    if (currentUserRole === 'doctor') cleanupDoctorListeners();
    await logoutUser();
    currentUserRole = null;
    showInterface('login');
}
