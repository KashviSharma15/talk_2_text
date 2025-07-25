import evaluate

wer = evaluate.load("wer")
reference = "hthereehe"
prediction = "<the stale smell of old beer lingers. it takes heat to bring out the odor. a cold dip restores health and zest. a salt pickle tastes fine with ham. tacos al pastor are my favorite. a zestful food is the hot cross bun.>".lower()

print("WER:", wer.compute(references=[reference], predictions=[prediction]))

