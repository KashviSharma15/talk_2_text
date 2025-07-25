// src/firebaseService.js

/**
 * @fileoverview Manages all interactions with Firebase services (Authentication, Firestore).
 * Provides functions for user authentication, data storage, and real-time data listening.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged
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
    getDoc, // Import getDoc for retrieving single documents
    getDocs, // Import getDocs for retrieving multiple documents from a query
    updateDoc // IMPORTED: Add updateDoc here to resolve ReferenceError
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import { FIREBASE_CONFIG, APP_ID, INITIAL_AUTH_TOKEN } from './constants.js';

let app;
let db;
let auth;
let userId = null; // Stores the current user's ID
let isAuthReadyPromise = null; // Promise to track Firebase auth readiness

/**
 * Initializes Firebase application and authentication.
 * Sets up an auth state listener to update the global userId.
 */
export async function initializeFirebase() {
    console.log("Initializing Firebase...");
    try {
        app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        auth = getAuth(app);

        // Create a promise that resolves when auth state is known
        isAuthReadyPromise = new Promise(resolve => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    console.log("Firebase Auth State Changed: User is signed in with UID:", userId);
                    // Ensure patient record exists for this user upon successful authentication
                    await ensurePatientExists(userId);
                } else {
                    console.log("Firebase Auth State Changed: No user is signed in. Attempting anonymous sign-in or custom token sign-in.");
                    userId = null;
                    try {
                        if (INITIAL_AUTH_TOKEN) {
                            await signInWithCustomToken(auth, INITIAL_AUTH_TOKEN);
                            userId = auth.currentUser.uid;
                            console.log("Signed in with custom token. UID:", userId);
                            await ensurePatientExists(userId);
                        } else {
                            await signInAnonymously(auth);
                            userId = auth.currentUser.uid;
                            console.log("Signed in anonymously. UID:", userId);
                            await ensurePatientExists(userId);
                        }
                    } catch (signInError) {
                        console.error("Error during initial sign-in:", signInError);
                        // Fallback to a random ID if sign-in fails (for very basic functionality without auth)
                        userId = crypto.randomUUID();
                        console.warn("Using a random UUID as userId due to sign-in failure:", userId);
                    }
                }
                unsubscribe(); // Unsubscribe after initial state is resolved
                resolve(); // Resolve the promise once auth state is determined
            });
        });

        await isAuthReadyPromise; // Wait for the initial auth state to be determined
        console.log("Firebase initialized and auth state determined.");

    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        userId = crypto.randomUUID(); // Fallback to a random ID if Firebase init fails
        console.warn("Using a random UUID as userId due to Firebase initialization failure:", userId);
        if (!isAuthReadyPromise) { // Ensure promise is always resolved
            isAuthReadyPromise = Promise.resolve();
        }
    }
}

/**
 * Waits for Firebase authentication to be ready.
 * @returns {Promise<void>} A promise that resolves when Firebase auth is ready.
 */
export function waitForFirebaseAuthReady() {
    return isAuthReadyPromise || Promise.resolve(); // Return the promise or an immediately resolved one if not set
}

/**
 * Returns the current user's ID.
 * @returns {string|null} The current user's ID, or null if not authenticated.
 */
export function getUserId() {
    return userId;
}

/**
 * Ensures a patient document exists for the given userId.
 * This is a simplified auto-registration for patients.
 * In a real app, doctors might add patients, or there'd be a more formal signup.
 * @param {string} uid - The user ID to check/create as a patient.
 */
async function ensurePatientExists(uid) {
    if (!db) return;
    // Corrected path to explicitly follow the security rule structure for public data
    // Rule: /artifacts/{appId}/public/data/{your_collection_name}/{documentId}
    // So, 'patients' becomes {your_collection_name} and 'uid' becomes {documentId}
    const patientsCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/patients`);
    const patientRef = doc(patientsCollectionRef, uid); // This correctly sets 'uid' as the document ID

    try {
        const patientSnap = await getDoc(patientRef);
        if (!patientSnap.exists()) {
            // If patient doesn't exist, create a basic record
            await setDoc(patientRef, {
                name: `Patient ${uid.substring(0, 6)}`, // A simple default name
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp(),
                // Add other default patient fields here
            });
            console.log(`Patient record created for ${uid}`);
        } else {
            // Update last activity using updateDoc for clarity and explicit partial update
            await updateDoc(patientRef, { lastActivity: serverTimestamp() });
            console.log(`Patient record updated for ${uid}`);
        }
    } catch (error) {
        console.error("Error ensuring patient exists:", error);
    }
}


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
    await waitForFirebaseAuthReady(); // Ensure auth is ready
    if (!patientUid || !doctorId) {
        console.error("Cannot save feedback: Patient UID or Doctor ID not available.");
        return;
    }
    try {
        const docRef = await addDoc(collection(db, `artifacts/${APP_ID}/users/${patientUid}/feedback`), {
            feedbackText: feedbackText,
            doctorId: doctorId,
            timestamp: serverTimestamp(),
            read: false // NEW: Mark feedback as unread by default
        });
        console.log("Feedback saved with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding feedback document: ", e);
    }
}

/**
 * Listens to real-time updates for a patient's feedback history.
 * @param {string} patientUid - The UID of the patient whose feedback to listen to.
 * @param {function(Array<Object>): void} callback - Callback function to receive feedback data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
export function listenToPatientFeedback(patientUid, callback) {
    if (!patientUid) {
        console.error("Cannot listen to feedback: Patient UID not provided.");
        callback([]);
        return () => {};
    }
    console.log(`[FirebaseService Debug] Setting up real-time listener for patient feedback for patient: ${patientUid}`);
    const q = query(
        collection(db, `artifacts/${APP_ID}/users/${patientUid}/feedback`),
        orderBy("timestamp", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const feedback = [];
        querySnapshot.forEach((doc) => {
            feedback.push({ id: doc.id, ...doc.data() });
        });
        console.log("[FirebaseService Debug] Fetched feedback data:", feedback);
        callback(feedback);
    }, (error) => {
        console.error("Error listening to patient feedback:", error);
        callback([]);
    });
    return unsubscribe;
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
        const feedbackRef = doc(db, `artifacts/${APP_ID}/users/${patientUid}/feedback`, feedbackId);
        await updateDoc(feedbackRef, { read: true });
        console.log(`Feedback ${feedbackId} marked as read for patient ${patientUid}`);
    } catch (e) {
        console.error("Error marking feedback as read:", e);
    }
}


/**
 * Fetches a list of patients for the doctor's dashboard.
 * In a real app, this would involve a more sophisticated query,
 * e.g., patients assigned to this doctor. For now, it fetches all users
 * who have pronunciation history.
 * @returns {Promise<Array<Object>>} An array of patient objects.
 */
export async function fetchPatientsForDoctor() {
    await waitForFirebaseAuthReady(); // Ensure auth is ready
    if (!db) {
        console.error("Firestore not ready. Cannot fetch patients.");
        return [];
    }
    try {
        // Fetch from the public 'patients' collection
        const patientsCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/patients`);
        const q = query(patientsCollectionRef, orderBy("lastActivity", "desc"));
        const querySnapshot = await getDocs(q);

        const patients = [];
        for (const docSnapshot of querySnapshot.docs) {
            const patientId = docSnapshot.id;
            const patientData = docSnapshot.data();

            // Fetch patient's latest history item from private collection to get actual last activity if available
            const historyQuery = query(
                collection(db, `artifacts/${APP_ID}/users/${patientId}/pronunciationHistory`),
                orderBy("timestamp", "desc"),
                limit(1)
            );
            const historySnapshot = await getDocs(historyQuery);

            let lastActivityString = 'N/A';
            if (!historySnapshot.empty && historySnapshot.docs[0].data().timestamp) {
                const lastTimestamp = historySnapshot.docs[0].data().timestamp.toDate();
                lastActivityString = timeAgo(lastTimestamp);
            } else if (patientData.lastActivity) {
                lastActivityString = timeAgo(patientData.lastActivity.toDate());
            }

            patients.push({
                id: patientId,
                name: patientData.name || `Patient ${patientId.substring(0, 6)}`,
                diagnosis: patientData.diagnosis || 'Undiagnosed', // Placeholder
                lastActivity: lastActivityString,
            });
        }
        console.log("[FirebaseService Debug] Fetched patients for doctor:", patients);
        return patients;
    } catch (e) {
        console.error("Error fetching patients for doctor: ", e);
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
        throw e; // Re-throw to be caught by calling function
    }
}

/**
 * Listens to real-time updates for a patient's assigned exercises.
 * @param {string} patientUid - The UID of the patient whose assigned exercises to listen to.
 * @param {function(Array<Object>): void} callback - Callback function to receive assigned exercises data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
export function listenToAssignedExercises(patientUid, callback) {
    if (!patientUid) {
        console.error("Cannot listen to assigned exercises: Patient UID not provided.");
        callback([]);
        return () => {};
    }
    console.log(`[FirebaseService Debug] Setting up real-time listener for assigned exercises for patient: ${patientUid}`);
    const q = query(
        collection(db, `artifacts/${APP_ID}/users/${patientUid}/assignedExercises`),
        orderBy("assignedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const exercises = [];
        querySnapshot.forEach((doc) => {
            exercises.push({ id: doc.id, ...doc.data() });
        });
        console.log("[FirebaseService Debug] Fetched assigned exercises data:", exercises);
        callback(exercises);
    }, (error) => {
        console.error("Error listening to assigned exercises:", error);
        callback([]);
    });
    return unsubscribe;
}

/**
 * Saves the doctor's custom rubric settings to Firestore.
 * @param {string} doctorId - The UID of the doctor.
 * @param {Object} settings - The rubric settings object.
 */
export async function saveRubricSettings(doctorId, settings) {
    await waitForFirebaseAuthReady();
    if (!doctorId) {
        console.error("Cannot save rubric settings: Doctor ID not available.");
        throw new Error("Doctor ID not available.");
    }
    try {
        // Use setDoc to create or overwrite a single document for the doctor's settings
        const docRef = doc(db, `artifacts/${APP_ID}/users/${doctorId}/rubricSettings/customRubric`);
        await setDoc(docRef, settings, { merge: true }); // Use merge to update specific fields
        console.log("Rubric settings saved successfully for doctor:", doctorId);
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
export async function getRubricSettings(doctorId) {
    await waitForFirebaseAuthReady();
    if (!doctorId) {
        console.error("Cannot get rubric settings: Doctor ID not available.");
        return null;
    }
    try {
        const docRef = doc(db, `artifacts/${APP_ID}/users/${doctorId}/rubricSettings/customRubric`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("Rubric settings fetched:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("No custom rubric settings found for doctor:", doctorId);
            return null;
        }
    } catch (e) {
        console.error("Error getting rubric settings: ", e);
        return null;
    }
}

/**
 * Fetches the total count of active patients.
 * @returns {Promise<number>} The number of active patients.
 */
export async function fetchActivePatientsCount() {
    await waitForFirebaseAuthReady();
    if (!db) {
        console.error("Firestore not ready. Cannot fetch active patients count.");
        return 0;
    }
    try {
        const patientsCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/patients`);
        const querySnapshot = await getDocs(patientsCollectionRef);
        return querySnapshot.size; // Returns the number of documents in the collection
    } catch (e) {
        console.error("Error fetching active patients count: ", e);
        return 0;
    }
}

/**
 * Fetches the count of practice sessions recorded today across all patients.
 * NOTE: This can be inefficient for a very large number of users/sessions.
 * For a highly scalable solution, consider server-side aggregation or a dedicated daily summary collection.
 * @returns {Promise<number>} The number of sessions today.
 */
export async function fetchTodaysSessionsCount() {
    await waitForFirebaseAuthReady();
    if (!db) {
        console.error("Firestore not ready. Cannot fetch today's sessions count.");
        return 0;
    }
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        // To count sessions across all patients, we need to query each patient's history.
        // This requires fetching all patient IDs first.
        const patients = await fetchPatientsForDoctor(); // Re-use existing patient fetch
        let todaysSessions = 0;

        for (const patient of patients) {
            const historyCollectionRef = collection(db, `artifacts/${APP_ID}/users/${patient.id}/pronunciationHistory`);
            // Query for documents where timestamp is greater than or equal to the start of today
            const q = query(
                historyCollectionRef,
                where("timestamp", ">=", today),
                orderBy("timestamp", "desc") // orderBy is still needed for where clauses on timestamp
            );
            const querySnapshot = await getDocs(q);
            todaysSessions += querySnapshot.size;
        }
        return todaysSessions;
    } catch (e) {
        console.error("Error fetching today's sessions count: ", e);
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
        const feedbackCollectionRef = collection(db, `artifacts/${APP_ID}/users/${patientId}/feedback`);
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
