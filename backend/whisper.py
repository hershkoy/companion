from faster_whisper import WhisperModel

# Initialize the model; choose the model size that fits your needs
model_size = "large-v3"
model = WhisperModel(model_size, device="cuda", compute_type="float16")

# Transcribe the audio file
audio_path = "output.wav"
segments, info = model.transcribe(audio_path, beam_size=5)

# Print the detected language
print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")

# Print the transcription segments
for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
