// src/firebaseService.js

/**
 * @fileoverview Manages Firebase Authentication (Email/Password) and Firestore data storage.
 * Adds registration, login, logout, and role-based user management.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    getDoc,
    getDocs,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import { FIREBASE_CONFIG, APP_ID } from './constants.js';

let app;
let db;
let auth;
let userId = null;
let currentUserData = null; // store logged-in user's Firestore data
let isAuthReadyPromise = null;

/**
 * Initialize Firebase and set up auth listener
 */
export async function initializeFirebase() {
    console.log("Initializing Firebase...");
    try {
        app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        auth = getAuth(app);

        // Auth state listener
        isAuthReadyPromise = new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    console.log("User signed in:", user.uid);
                    currentUserData = await fetchUserData(user.uid);
                } else {
                    console.log("No user signed in.");
                    userId = null;
                    currentUserData = null;
                }
                resolve();
            });
        });

        await isAuthReadyPromise;
        console.log("Firebase initialized and auth state determined.");
    } catch (err) {
        console.error("Firebase init failed:", err);
        userId = null;
        currentUserData = null;
        if (!isAuthReadyPromise) isAuthReadyPromise = Promise.resolve();
    }
}

/**
 * Wait until auth state is ready
 */
export function waitForFirebaseAuthReady() {
    return isAuthReadyPromise || Promise.resolve();
}

/**
 * Get current UID
 */
export function getUserId() {
    return userId;
}

/**
 * Register new user
 */
export async function registerUser(email, password, fullName, role, extraData = {}) {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName: fullName });

    const uid = userCred.user.uid;
    await setDoc(doc(db, "users", uid), {
        uid,
        name: fullName,
        email,
        role,
        ...extraData,
        createdAt: serverTimestamp()
    });

    console.log("User registered:", uid, "as", role);
    return uid;
}

/**
 * Login existing user
 */
export async function loginUser(email, password) {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    currentUserData = await fetchUserData(userCred.user.uid);
    return userCred.user;
}

/**
 * Logout user
 */
export async function logoutUser() {
    await signOut(auth);
    userId = null;
    currentUserData = null;
    console.log("User logged out.");
}

/**
 * Fetch user Firestore data
 */
export async function fetchUserData(uid) {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
        return userDoc.data();
    }
    return null;
}

/**
 * Get user's role
 */
export async function getUserRole(uid) {
    const data = await fetchUserData(uid);
    return data ? data.role : null;
}

/**
 * Get current logged-in user's data
 */
export function getCurrentUserData() {
    return currentUserData;
}


// ... (Keep all other Firestore methods unchanged: listenToPronunciationHistory, savePatientFeedback, etc.)



/**
 * Saves a pronunciation result to Firestore.
 * @param {string} sentence - The sentence practiced.
 * @param {number} overallScore - The overall score for the pronunciation.
 * @param {Array<Object>} wordDetails - Detailed breakdown of word pronunciation.
 */
export async function savePronunciationResult(sentence, overallScore, wordDetails) {
    await waitForFirebaseAuthReady(); // Ensure auth is ready
    if (!userId) {
        console.error("Cannot save pronunciation result: User not authenticated or ID not available.");
        return;
    }
    try {
        const docRef = await addDoc(collection(db, `artifacts/${APP_ID}/users/${userId}/pronunciationHistory`), {
            sentence: sentence,
            overallScore: overallScore,
            wordDetails: JSON.stringify(wordDetails), // Stringify complex object for Firestore
            timestamp: serverTimestamp() // Use server timestamp for consistency
        });
        console.log("Pronunciation result saved with ID: ", docRef.id);
    } catch (e) {
        console.error("Error saving pronunciation result: ", e); // Changed message for clarity
    }
}

/**
 * Listens to real-time updates for a patient's pronunciation history.
 * @param {string} patientId - The ID of the patient.
 * @param {function(Array<Object>): void} callback - Callback function to receive history data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
export function listenToPronunciationHistory(patientId, callback) {
    // This function assumes patientId is provided by the caller (doctorManager)
    // or that getUserId() will return a valid ID for the patient's own history.
    const targetId = patientId || userId;

    if (!targetId) {
        console.error("Cannot listen to history: Patient ID not provided or user not authenticated.");
        callback([]);
        return () => {}; // Return a no-op unsubscribe
    }
    console.log(`[FirebaseService Debug] Setting up real-time listener for pronunciation history for patient: ${targetId}`);
    const q = query(
        collection(db, `artifacts/${APP_ID}/users/${targetId}/pronunciationHistory`),
        orderBy("timestamp", "desc"), // Order by latest first
        limit(20) // Limit to the last 20 sessions
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const history = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Parse the wordsAnalysis string back into an object
            if (data.wordDetails && typeof data.wordDetails === 'string') {
                try {
                    data.wordDetails = JSON.parse(data.wordDetails);
                } catch (e) {
                    console.error("Error parsing wordDetails JSON:", e);
                    data.wordDetails = []; // Fallback to empty array on parse error
                }
            }
            history.push({ id: doc.id, ...data });
        });
        console.log("[FirebaseService Debug] Fetched history data:", history);
        callback(history);
    }, (error) => {
        console.error("Error listening to pronunciation history:", error);
        callback([]); // Pass empty array on error
    });
    return unsubscribe;
}

/**
 * Saves doctor's feedback for a specific patient to Firestore.
 * @param {string} patientUid - The UID of the patient receiving feedback.
 * @param {string} feedbackText - The feedback text.
 * @param {string} doctorId - The UID of the doctor providing feedback.
 */
export async function savePatientFeedback(patientUid, feedbackText, doctorId) {
    if (!patientUid || !doctorId) {
        console.error("Cannot save feedback: Patient UID or Doctor ID missing.");
        return;
    }

    try {
        const docRef = await addDoc(
            collection(db, `artifacts/${APP_ID}/users/${patientUid}/patientFeedback`), // ✅ Corrected path
            {
                feedbackText,
                doctorId,
                timestamp: serverTimestamp(),
                read: false
            }
        );
        console.log("[FirebaseService Debug] Feedback saved:", docRef.id);
    } catch (error) {
        console.error("Error adding feedback document: ", error);
        throw error;
    }
}

/**
 * Listens to real-time updates for a patient's feedback history.
 * @param {string} patientUid - The UID of the patient whose feedback to listen to.
 * @param {function(Array<Object>): void} callback - Callback function to receive feedback data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
export function listenToPatientFeedback(patientUid, callback) {
    try {
        const q = query(
            collection(db, `artifacts/${APP_ID}/users/${patientUid}/patientFeedback`), // ✅ Corrected path
            orderBy("timestamp", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const feedback = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("[FirebaseService Debug] Fetched feedback data:", feedback);
            callback(feedback);
        });
    } catch (error) {
        console.error("Error listening to patient feedback: ", error);
    }
}

/**
 * Marks a specific feedback document as read.
 * @param {string} patientUid - The UID of the patient.
 * @param {string} feedbackId - The ID of the feedback document to mark as read.
 */
export async function markFeedbackAsRead(patientUid, feedbackId) {
    await waitForFirebaseAuthReady();
    if (!patientUid || !feedbackId) {
        console.error("Cannot mark feedback as read: Patient UID or Feedback ID not provided.");
        return;
    }
    try {
        const feedbackRef = doc(db, `artifacts/${APP_ID}/users/${patientUid}/patientFeedback/${feedbackId}`);
        await updateDoc(feedbackRef, { read: true });
        console.log(`Feedback ${feedbackId} marked as read for patient ${patientUid}`);
    } catch (e) {
        console.error("Error marking feedback as read:", e);
    }
}


/**
 * Fetches a list of patients for the doctor's dashboard from /users where role = 'patient'.
 * Also computes last activity using pronunciation history under artifacts.
 */
export async function fetchPatientsForDoctor() {
    await waitForFirebaseAuthReady();
    if (!db) {
        console.error("Firestore not ready. Cannot fetch patients.");
        return [];
    }
    try {
        // Query users collection for patient profiles
        const patientsQuery = query(collection(db, "users"), where("role", "==", "patient"));
        const snapshot = await getDocs(patientsQuery);

        const patients = [];

        for (const docSnap of snapshot.docs) {
            const patientId = docSnap.id;
            const patientData = docSnap.data();

            // Compute last activity from pronunciation history (artifacts path)
            const historyQuery = query(
                collection(db, `artifacts/${APP_ID}/users/${patientId}/pronunciationHistory`),
                orderBy("timestamp", "desc"),
                limit(1)
            );
            const historySnapshot = await getDocs(historyQuery);

            let lastActivityString = 'N/A';
            if (!historySnapshot.empty) {
                const lastTimestamp = historySnapshot.docs[0].data().timestamp?.toDate();
                if (lastTimestamp) lastActivityString = timeAgo(lastTimestamp);
            }

            patients.push({
                id: patientId,
                name: patientData.name || `Patient ${patientId.substring(0, 6)}`,
                diagnosis: patientData.diagnosis || 'Undiagnosed',
                lastActivity: lastActivityString,
            });
        }

        console.log("[FirebaseService] Fetched patients:", patients);
        return patients;
    } catch (e) {
        console.error("Error fetching patients:", e);
        return [];
    }
}


/**
 * Helper function to format time into "X time ago" string.
 * @param {Date} date - The date object.
 * @returns {string} Formatted time string.
 */
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000; // years
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000; // months
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400; // days
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600; // hours
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60; // minutes
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

/**
 * Saves an assigned exercise to a patient's document in Firestore.
 * @param {string} patientUid - The UID of the patient to assign the exercise to.
 * @param {string} exerciseName - The name of the exercise to assign.
 * @param {string} assignedByDoctorId - The UID of the doctor assigning the exercise.
 */
export async function saveAssignedExercise(patientUid, exerciseName, assignedByDoctorId) {
    await waitForFirebaseAuthReady();
    if (!patientUid || !assignedByDoctorId) {
        console.error("Cannot save assigned exercise: Patient UID or Doctor ID not available.");
        throw new Error("Patient UID or Doctor ID not available.");
    }
    try {
        const docRef = await addDoc(collection(db, `artifacts/${APP_ID}/users/${patientUid}/assignedExercises`), {
            exerciseName: exerciseName,
            assignedBy: assignedByDoctorId,
            assignedAt: serverTimestamp()
        });
        console.log("Assigned exercise saved with ID: ", docRef.id);
    } catch (e) {
        console.error("Error assigning exercise: ", e);
        throw e;
    }
}

/**
 * Listens to real-time updates for a patient's assigned exercises.
 * @param {string} patientUid - The UID of the patient whose assigned exercises to listen to.
 * @param {function(Array<Object>): void} callback - Callback function to receive assigned exercises data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
export function listenToAssignedExercises(patientId, callback) {
    const q = query(
        collection(db, `artifacts/${APP_ID}/users/${patientId}/assignedExercises`),
        orderBy('assignedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const assignedExercises = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log("[FirebaseService Debug] Fetched assigned exercises:", assignedExercises);
        callback(assignedExercises);
    }, (error) => {
        console.error("Error listening to assigned exercises: ", error);
    });
}


/**
 * Saves the doctor's custom rubric settings to Firestore.
 * @param {string} doctorId - The UID of the doctor.
 * @param {Object} settings - The rubric settings object.
 */
export async function saveRubricSettings(doctorId, settings, patientId = null) {
    await waitForFirebaseAuthReady();
    if (!doctorId) {
        console.error("Doctor ID is required.");
        throw new Error("Doctor ID not available.");
    }

    try {
        let docRef;
        if (patientId) {
            docRef = doc(db, `artifacts/${APP_ID}/doctors/${doctorId}/patients/${patientId}/rubricSettings/customRubric`);
        } else {
            docRef = doc(db, `artifacts/${APP_ID}/doctors/${doctorId}/rubricSettings/customRubric`);
        }

        await setDoc(docRef, settings, { merge: true });
        console.log("Rubric settings saved for", patientId ? `patient ${patientId}` : `doctor ${doctorId}`);
    } catch (e) {
        console.error("Error saving rubric settings:", e);
        throw e;
    }
}


/**
 * Saves custom rubric settings for a specific patient.
 * @param {string} patientId - The UID of the patient.
 * @param {Object} settings - The rubric settings object.
 */
export async function saveRubricSettingsForPatient(doctorId, patientId, settings) {
    await waitForFirebaseAuthReady();

    if (!doctorId || !patientId) {
        console.error("Cannot save rubric settings: Missing doctor or patient ID.");
        throw new Error("Doctor and Patient ID required.");
    }

    try {
        const docRef = doc(db, `artifacts/${APP_ID}/doctors/${doctorId}/patients/${patientId}/rubricSettings/customRubric`);
        await setDoc(docRef, settings, { merge: true });
        console.log(`Rubric settings saved for doctor ${doctorId} and patient ${patientId}`);
    } catch (e) {
        console.error("Error saving rubric settings: ", e);
        throw e;
    }
}



/**
 * Retrieves the doctor's custom rubric settings from Firestore.
 * @param {string} doctorId - The UID of the doctor.
 * @returns {Promise<Object|null>} The rubric settings object, or null if not found.
 */
export async function getRubricSettings(doctorId, patientId = null) {
    await waitForFirebaseAuthReady();

    try {
        let docRef;
        if (patientId) {
            // Per-patient rubric (nested under doctor's patients)
            docRef = doc(db, `artifacts/${APP_ID}/doctors/${doctorId}/patients/${patientId}/rubricSettings/customRubric`);
        } else {
            // Fallback: Global rubric for doctor
            docRef = doc(db, `artifacts/${APP_ID}/doctors/${doctorId}/rubricSettings`);
        }

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("Rubric settings fetched:", docSnap.data());
            return docSnap.data();
        } else {
            console.warn("No rubric settings found.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching rubric settings:", error);
        return null;
    }
}

/**
 * Retrieves custom rubric settings for a specific patient.
 * @param {string} patientId - The UID of the patient.
 * @returns {Promise<Object|null>} The rubric settings object, or null if not found.
 */
export async function getRubricSettingsForPatient(patientId) {
    await waitForFirebaseAuthReady();
    if (!patientId) {
        console.warn("No patientId provided, cannot fetch rubric settings.");
        return null;
    }

    try {
        const docRef = doc(db, `artifacts/${APP_ID}/users/${patientId}/rubricSettings/customRubric`);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            console.log("Patient-specific rubric settings fetched:", snapshot.data());
            return snapshot.data();
        } else {
            console.log("No custom rubric settings found for patient:", patientId);
            return null;
        }
    } catch (e) {
        console.error("Error fetching patient rubric settings: ", e);
        return null;
    }
}



/**
 * Fetches the count of all active patients (role = 'patient').
 */
export async function fetchActivePatientsCount() {
    await waitForFirebaseAuthReady();
    if (!db) return 0;

    try {
        const q = query(collection(db, "users"), where("role", "==", "patient"));
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (e) {
        console.error("Error fetching active patients count:", e);
        return 0;
    }
}

/**
 * Fetches the total count of pronunciation sessions today across all patients.
 */
export async function fetchTodaysSessionsCount() {
    await waitForFirebaseAuthReady();
    if (!db) return 0;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all patients (role = 'patient')
        const q = query(collection(db, "users"), where("role", "==", "patient"));
        const snapshot = await getDocs(q);

        let todaysSessions = 0;

        for (const docSnap of snapshot.docs) {
            const patientId = docSnap.id;
            const historyQuery = query(
                collection(db, `artifacts/${APP_ID}/users/${patientId}/pronunciationHistory`),
                where("timestamp", ">=", today),
                orderBy("timestamp", "desc")
            );
            const historySnapshot = await getDocs(historyQuery);
            todaysSessions += historySnapshot.size;
        }

        return todaysSessions;
    } catch (e) {
        console.error("Error fetching today's sessions count:", e);
        return 0;
    }
}


/**
 * Fetches the number of practice sessions completed today by a specific patient.
 * @param {string} patientId - The ID of the patient.
 * @returns {Promise<number>} The number of sessions completed today.
 */
export async function fetchPatientTodaysSessions(patientId) {
    await waitForFirebaseAuthReady();
    if (!db || !patientId) {
        console.error("Firestore not ready or patientId not provided. Cannot fetch today's sessions for patient.");
        return 0;
    }
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const historyCollectionRef = collection(db, `artifacts/${APP_ID}/users/${patientId}/pronunciationHistory`);
        const q = query(
            historyCollectionRef,
            where("timestamp", ">=", today),
            orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (e) {
        console.error("Error fetching patient's today's sessions: ", e);
        return 0;
    }
}

/**
 * Calculates the patient's current practice streak (consecutive days with at least one session).
 * @param {string} patientId - The ID of the patient.
 * @returns {Promise<number>} The number of consecutive practice days.
 */
export async function fetchPatientPracticeStreak(patientId) {
    await waitForFirebaseAuthReady();
    if (!db || !patientId) {
        console.error("Firestore not ready or patientId not provided. Cannot fetch practice streak.");
        return 0;
    }

    try {
        const historyCollectionRef = collection(db, `artifacts/${APP_ID}/users/${patientId}/pronunciationHistory`);
        const q = query(
            historyCollectionRef,
            orderBy("timestamp", "desc") // Order by latest first
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return 0; // No sessions, no streak
        }

        let streak = 0;
        let lastDate = null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Collect unique dates (YYYY-MM-DD) from sessions
        const sessionDates = new Set();
        querySnapshot.forEach(doc => {
            const timestamp = doc.data().timestamp;
            if (timestamp) {
                const date = timestamp.toDate();
                date.setHours(0, 0, 0, 0); // Normalize to start of day
                sessionDates.add(date.toISOString().split('T')[0]);
            }
        });

        const sortedDates = Array.from(sessionDates).sort().reverse(); // Sort dates descending

        // Check if today has a session
        const todayString = today.toISOString().split('T')[0];
        let checkingDate = new Date(today.getTime()); // Start checking from today

        if (sessionDates.has(todayString)) {
            streak = 1;
            lastDate = today;
        } else {
            // If no session today, check yesterday
            checkingDate.setDate(today.getDate() - 1);
            const yesterdayString = checkingDate.toISOString().split('T')[0];
            if (sessionDates.has(yesterdayString)) {
                streak = 1;
                lastDate = checkingDate;
            } else {
                return 0; // No session today or yesterday, streak is 0
            }
        }

        // Continue backwards from lastDate
        for (let i = 0; i < sortedDates.length; i++) {
            const currentDateString = sortedDates[i];
            const currentDate = new Date(currentDateString);

            // If we've passed the current streak's start, or found a non-consecutive day
            if (currentDate.getTime() === lastDate.getTime()) {
                // This date is part of the streak, continue
            } else if (currentDate.getTime() === (lastDate.getTime() - (24 * 60 * 60 * 1000))) {
                // This date is exactly one day before the lastDate, extend streak
                streak++;
                lastDate = currentDate;
            } else {
                // Gap found, break streak
                break;
            }
        }
        
        return streak;

    } catch (e) {
        console.error("Error fetching patient's practice streak: ", e);
        return 0;
    }
}

/**
 * Fetches the count of unread feedback messages for a specific patient.
 * @param {string} patientId - The ID of the patient.
 * @returns {Promise<number>} The number of unread feedback messages.
 */
export async function fetchNewFeedbackCount(patientId) {
    await waitForFirebaseAuthReady();
    if (!db || !patientId) {
        console.error("Firestore not ready or patientId not provided. Cannot fetch new feedback count.");
        return 0;
    }
    try {
        const feedbackCollectionRef = collection(db, `artifacts/${APP_ID}/users/${patientId}/patientFeedback`);
        const q = query(
            feedbackCollectionRef,
            where("read", "==", false) // Query for unread feedback
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (e) {
        console.error("Error fetching new feedback count: ", e);
        return 0;
    }
}
