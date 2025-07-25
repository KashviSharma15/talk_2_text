import whisper

def transcribe_whisper(audio_path, model_size="small"):
    model = whisper.load_model(model_size)
    result = model.transcribe(audio_path)
    return result["text"]

# Path to your audio
audio = "samples/harvard.wav"

# Run transcription
transcript = transcribe_whisper(audio)
print("🗣️  Whisper Transcript:", transcript)

