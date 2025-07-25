// src/audioRecorder.js

/**
 * @fileoverview Manages audio recording from the user's microphone and waveform visualization.
 * Converts recorded audio to Float32Array (16kHz mono) for ASR processing.
 */

// Import UI manager functions for updating recording status and button visibility
// NOTE: DOMElements is not directly imported here, but assumed to be accessible
// via the main.js or patientManager.js which passes the waveformCanvas.

let mediaRecorder = null;
let audioChunksFloat32 = []; // Stores raw Float32Array audio data for ASR
let playableAudioChunks = []; // Stores MediaRecorder blobs for playback
let audioContext = null;
let analyser = null;
let sourceNode = null; // Renamed from 'source' to avoid conflict with 'source' in drawWaveform
let scriptProcessorNode = null; // For capturing raw audio data
let animationFrameId = null; // For waveform animation loop

// Define the target sample rate for ASR (Whisper models typically expect 16kHz)
const TARGET_SAMPLE_RATE = 16000;

// Callback function to be called when recording is complete
let onRecordingCompleteCallback = null;

/**
 * Initializes the AudioContext and AnalyserNode.
 * @returns {Promise<void>}
 */
async function initializeAudioContextAndAnalyser() {
    if (audioContext && audioContext.state === 'running') {
        // If context already exists and is running, reuse it.
        // This prevents "Failed to construct 'AudioContext': The number of AudioContexts is limited." errors.
        return;
    }
    // Create AudioContext with the target sample rate
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: TARGET_SAMPLE_RATE
    });
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Fast Fourier Transform size
}

/**
 * Draws the real-time waveform on the canvas.
 * @param {HTMLCanvasElement} waveformCanvas - The canvas element to draw the waveform on.
 */
function drawWaveform(waveformCanvas) {
    if (!analyser || !waveformCanvas) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    animationFrameId = requestAnimationFrame(() => drawWaveform(waveformCanvas));

    const bufferLength = analyser.frequencyBinCount; // Number of data points
    const dataArray = new Uint8Array(bufferLength); // Array to hold audio data
    analyser.getByteTimeDomainData(dataArray); // Populate array with time-domain data

    const canvasCtx = waveformCanvas.getContext('2d');
    const canvasWidth = waveformCanvas.width;
    const canvasHeight = waveformCanvas.height;

    // Clear canvas
    canvasCtx.fillStyle = 'rgb(229, 231, 235)'; // Tailwind gray-200
    canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(59, 130, 246)'; // Tailwind blue-500
    canvasCtx.beginPath();

    const sliceWidth = canvasWidth * 1.0 / bufferLength;
    let x = 0;

    // Draw waveform lines
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalize data to 0-2 range
        const y = v * canvasHeight / 2; // Scale to canvas height

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }

    canvasCtx.lineTo(canvasWidth, canvasHeight / 2); // Draw line to center right
    canvasCtx.stroke(); // Render the waveform
}

/**
 * Starts the audio recording process.
 * @param {HTMLCanvasElement} waveformCanvas - The canvas element for waveform visualization.
 * @param {function(Float32Array, string): void} onComplete - Callback function to be called when recording is complete,
 * passing the Float32Array audio data (16kHz mono) and the audio URL for playback.
 */
export async function startRecording(waveformCanvas, onComplete) {
    console.log("AudioRecorder: Starting recording...");
    onRecordingCompleteCallback = onComplete; // Store the callback

    try {
        await initializeAudioContextAndAnalyser(); // Initialize AudioContext and Analyser

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sourceNode = audioContext.createMediaStreamSource(stream);

        // Connect source to analyser for visualization
        sourceNode.connect(analyser);

        // Create a ScriptProcessorNode to get raw audio data
        const bufferSize = 4096; // Standard buffer size
        scriptProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1); // 1 input channel, 1 output channel

        scriptProcessorNode.onaudioprocess = (event) => {
            // Get audio data from the input buffer (mono channel)
            const inputBuffer = event.inputBuffer.getChannelData(0);
            audioChunksFloat32.push(new Float32Array(inputBuffer)); // Store as Float32Array
        };

        // Connect source -> analyser -> scriptProcessorNode -> audioContext.destination
        analyser.connect(scriptProcessorNode);
        scriptProcessorNode.connect(audioContext.destination); // Connect to destination to keep it alive

        // MediaRecorder for creating a playable audio URL (optional, but good for user feedback)
        // Connect source directly to MediaRecorder for simple audio capture
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
        playableAudioChunks = []; // Clear previous playable audio chunks

        mediaRecorder.ondataavailable = e => {
            playableAudioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            console.log("AudioRecorder: MediaRecorder stopped.");
            // Stop all tracks on the media stream to release microphone
            stream.getTracks().forEach(track => track.stop());
            
            // Concatenate all Float32Array chunks into one
            let totalLength = 0;
            for (const chunk of audioChunksFloat32) {
                totalLength += chunk.length;
            }
            const fullAudioBufferFloat32 = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunksFloat32) {
                fullAudioBufferFloat32.set(chunk, offset);
                offset += chunk.length;
            }

            // Create playable audio URL from MediaRecorder
            const audioBlob = new Blob(playableAudioChunks, { type: 'audio/webm; codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Call the provided callback with the processed Float32Array and playable URL
            if (onRecordingCompleteCallback) {
                onRecordingCompleteCallback(fullAudioBufferFloat32, audioUrl);
            }

            // Cleanup AudioContext and nodes
            cleanupAudioResources();
        };

        mediaRecorder.start(); // Start MediaRecorder for playable audio
        console.log("AudioRecorder: MediaRecorder started.");

        // Start waveform drawing
        waveformCanvas.classList.remove('hidden'); // Ensure canvas is visible
        drawWaveform(waveformCanvas);

    } catch (error) {
        console.error("AudioRecorder: Error starting recording:", error);
        // Propagate error or handle it in the UI
        if (onRecordingCompleteCallback) {
            onRecordingCompleteCallback(null, null); // Indicate failure
        }
        cleanupAudioResources(); // Attempt cleanup on error
        throw error;
    }
}

/**
 * Stops the audio recording process.
 */
export function stopRecording() {
    console.log("AudioRecorder: Stopping recording...");
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        // The onstop event handler will perform final cleanup and callback
    }
}

/**
 * Cleans up audio resources.
 */
export function cleanupAudioResources() {
    console.log("AudioRecorder: Cleaning up audio resources.");
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop(); // Ensure recording is stopped
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Stop any ongoing animation
        animationFrameId = null;
    }
    if (scriptProcessorNode) {
        scriptProcessorNode.disconnect();
        scriptProcessorNode = null;
    }
    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (audioContext && audioContext.state !== "closed") {
        audioContext.close().then(() => {
            console.log("AudioRecorder: AudioContext closed.");
        }).catch(e => console.error("AudioRecorder: Error closing AudioContext:", e));
    }
    audioContext = null; // Reset context reference
    mediaRecorder = null;
    audioChunksFloat32 = [];
    playableAudioChunks = [];
    onRecordingCompleteCallback = null;
    // Hide waveform canvas if it's still visible
    const waveformCanvas = document.getElementById('waveform');
    if (waveformCanvas) {
        waveformCanvas.classList.add('hidden');
    }
}

console.log("AudioRecorder.js exports: startRecording, stopRecording, cleanupAudioResources");
