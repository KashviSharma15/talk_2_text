// src/analysisService.js

/**
 * @fileoverview Provides services for analyzing speech pronunciation,
 * including transcription and comparison against target sentences.
 */

import { transcribeAudio } from './asrService.js';
import { getRubricSettings, getUserId } from './firebaseService.js';

// Default rubric settings if none are found in Firestore
const DEFAULT_RUBRIC_SETTINGS = {
    mispronunciationWeight: 50, // Penalty for mispronounced words (0-100)
    omissionWeight: 70,         // Penalty for omitted words (0-100)
    insertionWeight: 30,        // Penalty for inserted words (0-100)
    mispronunciationThreshold: 3 // Increased Levenshtein distance threshold for mispronunciation
};

/**
 * Performs pronunciation analysis by transcribing audio and comparing it
 * against a target sentence.
 * @param {Float32Array} audioData - The audio data as a Float32Array (16kHz mono).
 * @param {string} targetSentence - The sentence the user was supposed to say.
 * @returns {Promise<Object>} An analysis object including overall score and word-level details.
 */
export async function getPronunciationAnalysis(audioData, targetSentence) {
    console.log("Starting in-browser ASR transcription...");
    console.log("Target Text:", targetSentence);

    const userId = getUserId();
    const customRubric = userId ? await getRubricSettings(userId) : null;
    const rubricSettings = { ...DEFAULT_RUBRIC_SETTINGS, ...customRubric };
    console.log("Using rubric settings:", rubricSettings);

    try {
        const { transcribedText, words: transcribedWords } = await transcribeAudio(audioData);
        console.log("Transcribed Text: ", transcribedText);
        console.log("Transcribed Words with Timestamps: ", transcribedWords);

        const targetWordsArray = targetSentence.toLowerCase().split(/\s+/).filter(word => word.length > 0);

        // Compare words and get detailed results
        const wordDetails = compareWords(targetWordsArray, transcribedWords, rubricSettings.mispronunciationThreshold);
        console.log("Pronunciation Analysis Result:", { overallScore: 0, words: wordDetails }); // Log before score calculation

        // Calculate overall score based on word details and rubric settings
        const overallScore = calculateOverallScore(wordDetails, rubricSettings);

        return {
            overallScore: overallScore,
            words: wordDetails,
            transcribedText: transcribedText // Include transcribed text for reference
        };

    } catch (error) {
        console.error("Error during pronunciation analysis:", error);
        throw error;
    }
}

/**
 * Compares target words with transcribed words to identify correct, omitted,
 * inserted, and mispronounced words.
 * @param {Array<string>} targetWords - Array of target words (lowercase).
 * @param {Array<Object>} transcribedWords - Array of transcribed word objects.
 * @param {number} mispronunciationThreshold - Levenshtein distance threshold for mispronunciation.
 * @returns {Array<Object>} Array of word detail objects with error types.
 */
function compareWords(targetWords, transcribedWords, mispronunciationThreshold) {
    const results = [];
    const usedTranscribedIndices = new Set(); // To track which transcribed words have been matched

    // Step 1: Process target words to find matches in transcribed words
    targetWords.forEach(targetWord => {
        const lowerTargetWord = targetWord.toLowerCase();
        let matched = false;

        // First, try to find an exact match
        for (let i = 0; i < transcribedWords.length; i++) {
            if (!usedTranscribedIndices.has(i) && transcribedWords[i].word.toLowerCase() === lowerTargetWord) {
                results.push({ word: targetWord, error: null }); // Correct
                usedTranscribedIndices.add(i);
                matched = true;
                console.log(`Match: Target "${targetWord}" -> Transcribed "${transcribedWords[i].word}" (Exact)`);
                break;
            }
        }

        if (!matched) {
            // If no exact match, look for a "mispronunciation" candidate
            let bestMispronunciationMatch = null;
            let minDistance = Infinity;

            for (let i = 0; i < transcribedWords.length; i++) {
                if (!usedTranscribedIndices.has(i)) {
                    const distance = levenshteinDistance(lowerTargetWord, transcribedWords[i].word.toLowerCase());
                    console.log(`Comparing "${lowerTargetWord}" with "${transcribedWords[i].word.toLowerCase()}" - Distance: ${distance}`);
                    // If distance is within threshold and better than previous best
                    if (distance > 0 && distance <= mispronunciationThreshold && distance < minDistance) {
                        minDistance = distance;
                        bestMispronunciationMatch = { transcribedWord: transcribedWords[i].word, index: i };
                    }
                }
            }

            if (bestMispronunciationMatch) {
                // Found a close match, mark as mispronunciation
                results.push({ word: targetWord, error: 'mispronunciation', transcribedAs: bestMispronunciationMatch.transcribedWord });
                usedTranscribedIndices.add(bestMispronunciationMatch.index);
                console.log(`Match: Target "${targetWord}" -> Transcribed "${bestMispronunciationMatch.transcribedWord}" (Mispronunciation, Distance: ${minDistance})`);
            } else {
                // No match found, word was omitted
                results.push({ word: targetWord, error: 'omission' });
                console.log(`No match for target "${targetWord}" - Marked as Omission.`);
            }
        }
    });

    // Step 2: Identify insertions (transcribed words that were not matched to any target word)
    transcribedWords.forEach((transcribedWord, index) => {
        if (!usedTranscribedIndices.has(index)) {
            results.push({ word: transcribedWord.word, error: 'insertion' });
            console.log(`Insertion: Transcribed "${transcribedWord.word}"`);
        }
    });

    return results;
}

/**
 * Calculates the Levenshtein distance between two strings.
 * @param {string} a - The first string.
 * @param {string} b - The second string.
 * @returns {number} The Levenshtein distance.
 */
function levenshteinDistance(a, b) {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // Substitution
                                       Math.min(matrix[i][j - 1] + 1, // Insertion
                                                matrix[i - 1][j] + 1)); // Deletion
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculates the overall pronunciation score based on word-level details and rubric settings.
 * @param {Array<Object>} wordDetails - Array of word detail objects.
 * @param {Object} rubricSettings - The rubric settings with weights for different error types.
 * @returns {number} The overall score (0-100).
 */
function calculateOverallScore(wordDetails, rubricSettings) {
    if (wordDetails.length === 0) {
        return 0; // No words, no score
    }

    let totalPossibleScore = 0;
    let actualScore = 0;

    // Calculate score based on target words and their errors
    wordDetails.forEach(word => {
        // Only count target words towards the total possible score
        // Insertions don't contribute to totalPossibleScore, but penalize actualScore
        if (word.error !== 'insertion') {
            totalPossibleScore += 100; // Each target word is worth 100 points initially
        }

        if (word.error === null) {
            actualScore += 100; // Correct word
        } else if (word.error === 'mispronunciation') {
            actualScore += (100 * (100 - rubricSettings.mispronunciationWeight)) / 100; // Apply mispronunciation penalty
        } else if (word.error === 'omission') {
            actualScore += (100 * (100 - rubricSettings.omissionWeight)) / 100; // Apply omission penalty
        } else if (word.error === 'insertion') {
            // Insertions penalize the score without adding to totalPossibleScore
            actualScore -= rubricSettings.insertionWeight;
        }
    });

    // Ensure score doesn't go below zero or above 100
    let finalScore = (totalPossibleScore > 0) ? (actualScore / totalPossibleScore) * 100 : 0;
    finalScore = Math.max(0, Math.min(100, finalScore));

    return Math.round(finalScore);
}
