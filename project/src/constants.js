// src/constants.js

/**
 * @fileoverview Defines global constants used throughout the application.
 */

/**
 * Configuration for Firebase.
 * IMPORTANT: This now correctly checks for the global __firebase_config
 * provided by the Canvas environment. If running outside Canvas, you'll need
 * to manually provide valid Firebase credentials here.
 * @type {object}
 */
export const FIREBASE_CONFIG = typeof __firebase_config !== 'undefined' ?
    JSON.parse(__firebase_config) :
    {
        apiKey: "AIzaSyDwjxv_G5v5fcssb_Hkegt09RzCuuukrOo", // REPLACE THIS WITH YOUR ACTUAL API KEY IF NOT IN CANVAS
        authDomain: "speechtherapyapp-f524f.firebaseapp.com",
        projectId: "speechtherapyapp-f524f",
        storageBucket: "speechtherapyapp-f524f.firebasestorage.app",
        messagingSenderId: "61000903231",
        appId: "1:61000903231:web:eac4f8841f89db73e4268a"
    };

/**
 * The unique application ID provided by the Canvas environment.
 * @type {string}
 */
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'speech-therapy-app';

/**
 * The initial custom authentication token provided by the Canvas environment.
 * @type {string|undefined}
 */
export const INITIAL_AUTH_TOKEN = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

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
