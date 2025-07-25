from vosk import Model, KaldiRecognizer
import wave
import json

def transcribe_vosk(audio_path, model_path):
    wf = wave.open(audio_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
        raise ValueError("Audio file must be WAV format PCM mono")

    model = Model(model_path)
    rec = KaldiRecognizer(model, wf.getframerate())

    results = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            results.append(result.get("text", ""))
    final_result = json.loads(rec.FinalResult())
    results.append(final_result.get("text", ""))

    return " ".join(results)

if __name__ == "__main__":
    audio = "samples/test2.wav"
    model_dir = "models/vosk/vosk-model-small-en-us-0.15"
    transcript = transcribe_vosk(audio, model_dir)
    print("Vosk Transcription:\n", transcript)

