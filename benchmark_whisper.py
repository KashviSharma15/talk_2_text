import time
import torch
import whisper
import psutil
import os
from jiwer import wer, mer, cer

# --- CONFIGURATION ---
MODELS = ["tiny", "base", "small", "medium", "large", "large-v1", "large-v2", "large-v3"]
AUDIO_PATH = "samples/harvard.wav"
REFERENCE_TEXT = "she had your dark suit in greasy wash water all year"

# --- FUNCTION TO FORMAT BYTES TO MB ---
def bytes_to_mb(x):
    return round(x / (1024 ** 2), 2)

# --- LOOP OVER EACH MODEL ---
for model_name in MODELS:
    print(f"\n================== {model_name.upper()} ==================")

    # Clear CUDA cache before loading
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    # --- START TIMER & MEMORY ---
    start_time = time.time()
    start_mem = psutil.Process().memory_info().rss

    # --- LOAD MODEL ---
    model = whisper.load_model(model_name)

    mid_mem = psutil.Process().memory_info().rss  # after loading model
    model_size_ram = bytes_to_mb(mid_mem - start_mem)

    # --- TRANSCRIBE ---
    result = model.transcribe(AUDIO_PATH)
    predicted_text = result["text"].strip()

    # --- END TIMER & MEMORY ---
    end_time = time.time()
    end_mem = psutil.Process().memory_info().rss
    runtime = round(end_time - start_time, 2)
    memory_used = bytes_to_mb(end_mem - start_mem)

    # --- ACCURACY METRICS ---
    wer_score = round(wer(REFERENCE_TEXT, predicted_text), 3)
    mer_score = round(mer(REFERENCE_TEXT, predicted_text), 3)
    cer_score = round(cer(REFERENCE_TEXT, predicted_text), 3)
    breakdown = compute_measures(REFERENCE_TEXT, predicted_text)

    # --- OUTPUT ---
    print("Transcription:", predicted_text)
    print("Time Taken:", runtime, "seconds")
    print("Model RAM Size:", model_size_ram, "MB")
    print("Total Memory Used:", memory_used, "MB")
    print("WER:", wer_score, "MER:", mer_score, "CER:", cer_score)
    

