// src/constants.js

// Replace with your actual Firebase configuration
// You can find this in your Firebase project settings -> Project settings -> General -> Your apps -> Firebase SDK snippet (Config)
export const FIREBASE_CONFIG = {
        apiKey: "AIzaSyDwjxv_G5v5fcssb_Hkegt09RzCuuukrOo",
        authDomain: "speechtherapyapp-f524f.firebaseapp.com",
        projectId: "speechtherapyapp-f524f",
        storageBucket: "speechtherapyapp-f524f.firebasestorage.app",
        messagingSenderId: "61000903231",
        appId: "1:61000903231:web:eac4f8841f89db73e4268a"
};

// This APP_ID is used for Firestore collection paths (e.g., artifacts/{APP_ID}/...)
// It helps to namespace your data if you have multiple applications using the same Firestore project.
// You can make this anything unique to your application, e.g., 'speech-therapy-app-v1'
export const APP_ID = "speech-therapy-app";

// If you are using custom authentication tokens (e.g., from a backend)
// For anonymous sign-in, leave this as null or an empty string.
export const INITIAL_AUTH_TOKEN = null;

// Default sentences for the patient to practice if no specific exercises are assigned
export const SENTENCES_TO_PRACTICE = [
    "The quick brown fox jumps over the lazy dog.",
    "She sells seashells by the seashore.",
    "Peter Piper picked a peck of pickled peppers.",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    "Betty Botter bought some butter but she said the butter's bitter."
];

// Define specific sentences for each exercise type
export const EXERCISE_SENTENCES = {
    "R-sound practice": [
        "Rahul runs really fast.",
        "The red car raced around the track.",
        "A roaring fire warmed the room.",
        "The brave knight rescued the princess.",
        "Remember to read your book."
    ],
    "S-sound practice": [
        "She sells shiny shoes.",
        "The sun shines brightly in the sky.",
        "Sally sings sweet songs.",
        "Seven sleepy sheep slept soundly.",
        "The snake slithered silently through the grass."
    ],
    "Fluency reading": [
        "In the quiet forest, a tiny squirrel gathered nuts for the winter.",
        "The old wizard cast a powerful spell, and the ancient castle began to glow.",
        "Children laughed and played in the park, enjoying the warm afternoon sunshine.",
        "The vast ocean stretched endlessly, its waves crashing gently against the sandy shore.",
        "Learning new things can be challenging, but it is always rewarding in the end."
    ]
};
