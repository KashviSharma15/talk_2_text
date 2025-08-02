/**
 * @fileoverview Defines global constants used throughout the application.
 * Uses a local config.js (ignored in Git) to protect sensitive Firebase keys.
 */

import { FIREBASE_CONFIG as LOCAL_FIREBASE_CONFIG, APP_ID as LOCAL_APP_ID } from './config.js';

/**
 * Firebase Configuration
 * (Imported from config.js which is ignored in Git)
 */
export const FIREBASE_CONFIG = LOCAL_FIREBASE_CONFIG;

/**
 * Application ID (used for artifacts pathing and namespacing)
 */
export const APP_ID = LOCAL_APP_ID;

/**
 * Initial custom authentication token (if any)
 */
export const INITIAL_AUTH_TOKEN = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

/**
 * Default sentences for patients to practice if no specific exercises are assigned.
 */
export const SENTENCES_TO_PRACTICE = [
    "The quick brown fox jumps over the lazy dog.",
    "She sells seashells by the seashore.",
    "Peter Piper picked a peck of pickled peppers.",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
    "Betty Botter bought some butter but she said the butter's bitter."
];

/**
 * Predefined sentences mapped to specific exercise types.
 */
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
