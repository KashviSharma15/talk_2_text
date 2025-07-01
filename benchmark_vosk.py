import wave
import time
import psutil
import json
import os
from vosk import Model, KaldiRecognizer
from jiwer import wer, mer, cer

# --- CONFIGURATION ---
MODEL_PATH = "models/vosk/vosk-model-small-en-us-0.15"
AUDIO_PATH = "samples/english.wav"
REFERENCE_TEXT = """This affects people within our own societies and countries who speak English as a first language or at first language level because it affects people who have a particular type of dialect or vernacular that they use in their own communities. My own original dialect of English, for example, is seen as a low-class variant of English. If I were to speak it to people, I'm not going to go for a job interview, I would be perceived very differently to how I'm perceived now speaking standard northern English. Similar things happen in the US with African-American vernacular English where it will be perceived differently in different contexts and there are many, many different elements that come into this that intersect between native speakers, speakers as a second language, people who are native level speakers, people who have a community language and then they go through an English language education system and therefore have the native language as a second language. So I think that's a really important aspect of the language that we're seeing in our society. I think that's a really important aspect of the language that we're seeing in our society. I think that's a really important aspect of the native level ability. So there are so many layers to that sort of idea that it becomes quite complicated and I think possibly the people that fit into that category actually, the last one that I mentioned, of you have a community language or a family language and you learn English because you go through the system and you speak it at school, you speak it outside, you speak to a native level, when they try and go abroad because they speak a local language too, they find it very difficult and they I imagine sometimes even start doubting themselves and it's like logically there is an issue to overcome that. Yeah, that's just my thoughts on what I've heard. Nice, thank you. Well said, thank you, thank you very much. Anything to add? Guys, please, Teacher Fiona, please go ahead. I have loads to say. I have loads to say, though, so I'm happy to wait for someone else to jump in. Yeah, I'd love to get to your point. I just want to, is there like Mustafa, I don't, I hate this non-native, is there anyone else? Because I just don't, it seems as though the quote unquote, the natives are and I don't like that. So feel free. Of course. Mustafa, Rama. Okay, I'm going to ask a question. Today I saw a post on Facebook. Okay, I'm going to ask a question. Today I saw a post on Facebook. Facebook saying, there are, I think, eight sounds, if you say them correctly in English, you are going to sound exactly like native speakers but actually, I didn't believe it because I think there is something called phonotex, we have to be perfect at it. Yeah, and I have a question about phonotex. It is that important to study phonotex to be able to speak correctly? Or no need for that, actually I'm studying this subject at university and they just, they are making it easy for me to speak with another person. Actually I'm studying this subject at university and they just, they are making it easy for me to speak with another person. And the professors at the university just teach us how to write a sentence in a phonetic way. Transcription, I think we call it. I don't know. I have forgotten, actually. So I just want to know, is it important to study phonetic writing? Is that helpful to improve your speaking? Or it has nothing to do with speaking, just for writing? Who's going to answer? I can answer that if you want. Please, go ahead. So I think in terms of like the phonetic, you mean like IPA, right? Like the symbols to write down the sounds of the language. Yeah, exactly. That's it. Personally, I don't think it's necessary, but I do think it's really interesting and quite a nice thing to use. I don't... I can distinguish between them, especially diphthongs. I found them very difficult for me to... I don't know how to distinguish between how can I use this or that. So I find them difficult for me. I mean, the thing is, nowadays, I think maybe they were more relevant before you could literally hear the pronunciation. You could just go online and press the little speaker on Google and hear the words that you want to hear. Yeah, I don't know if they're... Personally, I don't think they're that relevant for teaching. And I think if I were teaching a student from scratch, maybe a young learner, maybe I would teach the symbols. But I don't think there's any reason to like stress about learning them. No, but they are fun. And so you think that there is no need to learn them, right? Because some people who speak in a very good way, but they didn't know them at all. Okay, they don't know them at all. But they are fun. I am learning them, but maybe I am not sound like others. There are maybe a lot of people who speak better than me, but they didn't learn them. I am learning them, but I feel like there is no need for them. There is no beneficial stuff of learning them. Yeah, I mean, you mentioned you're studying at university, right? You're studying this as part of your degree. Is that right? Yeah, exactly. Yeah, I mean, I guess, yeah, in that case, you need to learn them. Yeah. You need to learn them, but just to pass the test or whatever. I just wanted to know, should I?"""  # Keep your full reference text here

# --- FUNCTION TO CALCULATE MODEL SIZE ---
def get_dir_size_mb(directory):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(directory):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.exists(fp):
                total_size += os.path.getsize(fp)
    return total_size / (1024 ** 2)  # Return size in MB

# --- START TIMER AND MEMORY ---
start_time = time.time()
start_memory = psutil.Process().memory_info().rss

# --- LOAD MODEL AND AUDIO ---
model = Model(MODEL_PATH)
wf = wave.open(AUDIO_PATH, "rb")
rec = KaldiRecognizer(model, wf.getframerate())

# --- TRANSCRIBE AUDIO ---
text = ""
while True:
    data = wf.readframes(4000)
    if len(data) == 0:
        break
    if rec.AcceptWaveform(data):
        text += json.loads(rec.Result())["text"] + " "
text += json.loads(rec.FinalResult())["text"]

# --- END TIMER AND MEMORY ---
end_time = time.time()
end_memory = psutil.Process().memory_info().rss

# --- PRINT TRANSCRIPTION & PERFORMANCE ---
print("Predicted Text:", text.strip())
print("Time Taken:", round(end_time - start_time, 2), "seconds")
print("Memory Used:", round((end_memory - start_memory) / (1024 ** 2), 2), "MB")
print("Model Size:", round(get_dir_size_mb(MODEL_PATH), 2), "MB")

# --- EVALUATE ACCURACY (using jiwer) ---
print("\n--- Accuracy Metrics ---")
print("WER:", round(wer(REFERENCE_TEXT, text), 3))
print("MER:", round(mer(REFERENCE_TEXT, text), 3))
print("CER:", round(cer(REFERENCE_TEXT, text), 3))


