// src/asrService.js 

 /** * @fileoverview Handles in-browser Speech Recognition using Hugging Face Transformers.js 
  * (Whisper model via WebAssembly). This module loads the model and performs transcription. 
  */ 

 // Import pipeline and env from transformers.js CDN 
 // Keeping version 2.17.2 as per your latest console output. 
 import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'; 

 // IMPORTANT: Configure transformers.js to look for models in a local 'models' directory. 
 // This is the most direct way to resolve the persistent 404 and TypeError. 
 // We explicitly set env.localModelPath and disable remote fetching. 
 env.localModelPath = './models/'; // Explicitly point to a local 'models' folder 
 env.allowRemoteModels = false; // Disable remote fetching to force local loading 

 // Define the ASR pipeline outside the function to load the model once 
 let transcriber = null; 
 let modelLoadingPromise = null; 

 /** * Initializes the ASR model pipeline. This function should be called once 
  * when the application starts or before the first transcription. 
  * It will download the model files to the user's browser. 
  * @param {function(string): void} onStatusUpdate - Callback for status updates during loading. 
  * @returns {Promise<void>} 
  */ 
 export async function initializeAsrModel(onStatusUpdate) { 
     if (transcriber) { 
         onStatusUpdate('ASR model already loaded.'); 
         return; 
     } 
     if (modelLoadingPromise) { 
         onStatusUpdate('ASR model is already loading...'); 
         return modelLoadingPromise; 
     } 

     onStatusUpdate('Loading ASR model from local files (this may still take a moment)...'); 
     modelLoadingPromise = (async () => { 
         try { 
             // Use 'Xenova/whisper-small.en' as the model ID. 
             // transformers.js will now combine env.localModelPath with this ID 
             // to look for files in ./models/Xenova/whisper-small.en/ 
             transcriber = await pipeline( 
                 'automatic-speech-recognition',  
                 'Xenova/whisper-small.en', // This is the model ID 
                 { 
                     // No progress_callback for local files as they are loaded from disk 
                     // but we can still update status for the loading process. 
                 } 
             ); 
             onStatusUpdate('ASR model loaded successfully from local files!'); 
         } catch (error) { 
             console.error('Error loading ASR model from local files:', error); 
             onStatusUpdate('Failed to load ASR model from local files. Please check console and file paths.'); 
             transcriber = null; // Reset transcriber on error 
             throw error; // Re-throw to propagate error 
         } finally { 
             modelLoadingPromise = null; // Clear the promise once loading is complete or failed 
         } 
     })(); 
     return modelLoadingPromise; 
 } 

 /** * Transcribes audio data using the loaded ASR model. 
  * @param {Float32Array} audioData - The audio data as a Float32Array (16kHz mono). 
  * @returns {Promise<Object>} A promise that resolves to the transcription result, 
  * including text and word-level details. 
  */ 
 export async function transcribeAudio(audioData) { 
     if (!transcriber) { 
         console.error('ASR model not loaded. Call initializeAsrModel first.'); 
         throw new Error('ASR model not loaded.'); 
     } 

     try { 
         // Perform transcription. We request return_timestamps: 'word' for word-level details. 
         const output = await transcriber(audioData, {  
             chunk_length_s: 30, // Process audio in 30-second chunks 
             stride_length_s: 5, // Overlap chunks by 5 seconds to avoid cutting words 
             return_timestamps: 'word', // Request word-level timestamps 
             language: 'english', // Explicitly set language for the model 
         }); 

         // The output structure typically includes `text` and `chunks` (for word-level details) 
         // Example output.chunks: [{ text: 'Hello', timestamp: [0.1, 0.5] }, { text: 'world', timestamp: [0.6, 1.0] }] 
         console.log("ASR Transcription Output:", output); 

         // Process the output to match your expected analysis format 
         const transcribedText = output.text || ''; 
         const words = (output.chunks || []).map(chunk => ({ 
             word: chunk.text.trim(), 
             start: chunk.timestamp[0], 
             end: chunk.timestamp[1], 
             // Note: Transformers.js Whisper does not directly provide word-level confidence scores. 
             // You might need to infer clarity or confidence from other means or accept this limitation. 
             // For a pronunciation game, the presence/absence and timing are most critical. 
         })).filter(w => w.word !== ''); // Filter out empty words 

         return { transcribedText, words }; 

     } catch (error) { 
         console.error('Error during audio transcription:', error); 
         throw error; 
     } 
 }