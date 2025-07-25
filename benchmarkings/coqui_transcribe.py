import os
import wave
import numpy as np
import stt

def transcribe_coqui(audio_path, model_path, scorer_path):
    model = stt.Model(model_path)
    model.enableExternalScorer(scorer_path)

    with wave.open(audio_path, 'rb') as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2
        assert wf.getframerate() == 16000
        audio = np.frombuffer(wf.readframes(wf.getnframes()), np.int16)
    
    text = model.stt(audio)
    return text

# Paths
audio = "samples/test.wav"
model_path = "models/coqui/model.tflite"
scorer_path = "models/coqui/huge-vocabulary.scorer"

transcript = transcribe_coqui(audio, model_path, scorer_path)
print("🗣️  Coqui Transcript:", transcript)

