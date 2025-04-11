from kokoro import KPipeline
import soundfile as sf
import numpy as np
import torch
import os
from datetime import datetime
import sounddevice as sd
from time import sleep
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
import threading
import subprocess

def get_gpu_memory():
    """Get GPU memory usage using nvidia-smi"""
    try:
        result = subprocess.check_output(
            ['nvidia-smi', '--query-gpu=memory.used,memory.total', '--format=csv,nounits,noheader'],
            encoding='utf-8'
        )
        used, total = map(int, result.strip().split(','))
        return f"{used}MB / {total}MB"
    except:
        return "Unable to get GPU memory"

def print_gpu_info():
    """Print detailed GPU information"""
    if torch.cuda.is_available():
        print("\nGPU Information:")
        print(f"GPU Device: {torch.cuda.get_device_name(0)}")
        print(f"CUDA Version: {torch.version.cuda}")
        print(f"PyTorch CUDA: {torch.backends.cuda.is_built()}")
        print(f"GPU Memory Usage: {get_gpu_memory()}")
        print(f"Torch Allocated: {torch.cuda.memory_allocated(0)/1024**2:.2f}MB")
        print(f"Torch Reserved: {torch.cuda.memory_reserved(0)/1024**2:.2f}MB")
    else:
        print("\nNo GPU available!")

# Check if CUDA is available and force it if available
if torch.cuda.is_available():
    torch.set_default_tensor_type('torch.cuda.FloatTensor')
    device = torch.device('cuda')
else:
    device = torch.device('cpu')

print("\nInitial Setup:")
print(f"Using device: {device}")
print_gpu_info()

def process_sentence(sentence, pipeline):
    """Process a single sentence and return the audio data"""
    print(f"\nProcessing: {sentence[:50]}...")
    print(f"Current GPU Memory: {get_gpu_memory()}")
    
    # Add proper punctuation back for better speech synthesis
    sentence = sentence + "."
    
    # Generate speech for this sentence
    audio_generator = pipeline(sentence, voice="af_heart", speed=1.5)
    
    # Collect chunks for this sentence
    audio_chunks = []
    
    for chunk in audio_generator:
        # Get the audio data from the Result object
        if hasattr(chunk, 'audio'):
            chunk_data = chunk.audio
            if isinstance(chunk_data, torch.Tensor) and not chunk_data.is_cuda and torch.cuda.is_available():
                chunk_data = chunk_data.cuda()
        else:
            chunk_data = chunk  # If chunk is directly the audio data
            if isinstance(chunk_data, torch.Tensor) and not chunk_data.is_cuda and torch.cuda.is_available():
                chunk_data = chunk_data.cuda()

        # Convert chunk to NumPy array safely
        if isinstance(chunk_data, torch.Tensor):
            if chunk_data.is_cuda:
                chunk_data = chunk_data.cpu()
            chunk_data = chunk_data.detach().numpy().astype(np.float32)
        elif isinstance(chunk_data, (list, tuple)):
            chunk_data = np.asarray(chunk_data, dtype=np.float32)
        elif isinstance(chunk_data, np.ndarray):
            chunk_data = chunk_data.astype(np.float32)
        else:
            print(f"Skipping unknown chunk data type: {type(chunk_data)}")
            continue

        # Now flatten and store
        audio_chunks.append(chunk_data.flatten())

    if audio_chunks:
        # Concatenate chunks for this sentence
        return np.concatenate(audio_chunks)
    return None

def play_audio(audio_data):
    """Play audio data with sounddevice"""
    if audio_data is not None:
        try:
            sd.play(audio_data, samplerate=22050)
            sd.wait()  # Wait until the audio is finished playing
            sleep(0.5)  # Add a small pause between sentences
        except Exception as e:
            print(f"Error playing audio: {str(e)}")

print("\nInitializing Pipeline:")
# Initialize the pipeline with your desired language code and GPU device
pipeline = KPipeline(lang_code='a', device=device)  # 'a' for American English
print_gpu_info()

# Input text for speech synthesis
text = "Hello, this is a test of the Kokoro text-to-speech system. The collapse in stock markets could trigger a powerful signal (not seen since 2020). We have seen a sharp and heavy drop in the stock markets, a risk that we warned about a month ago in March of this year. Back in March, in our video interview with Manuel Blay, we warned about a potential further decline and drop in the stock markets due to the dow theory bearish signal. But now there are two probable paths for the stock markets. Are we getting close to a bear market or capitulation? We look at the charts"

# Split text into sentences using regex
sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]

# Create output directory if it doesn't exist
output_dir = "output"
os.makedirs(output_dir, exist_ok=True)

# Process sentences in parallel
# Reduce number of workers when using GPU to avoid memory issues
MAX_WORKERS = 2 if torch.cuda.is_available() else 4
all_audio_data = []
audio_queue = Queue()

print(f"\nProcessing {len(sentences)} sentences in parallel with {MAX_WORKERS} workers...")
print_gpu_info()

with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    # Submit all sentences for processing
    future_to_sentence = {
        executor.submit(process_sentence, sentence, pipeline): i 
        for i, sentence in enumerate(sentences)
    }
    
    # Create a list to store results in order
    results = [None] * len(sentences)
    
    # Process completed sentences as they finish
    for future in as_completed(future_to_sentence):
        sentence_idx = future_to_sentence[future]
        try:
            audio_data = future.result()
            if audio_data is not None:
                results[sentence_idx] = audio_data
                print(f"Completed sentence {sentence_idx + 1}/{len(sentences)}")
                print_gpu_info()
        except Exception as e:
            print(f"Error processing sentence {sentence_idx + 1}: {str(e)}")

    # Play audio in correct order and collect for saving
    for i, audio_data in enumerate(results):
        if audio_data is not None:
            all_audio_data.append(audio_data)
            play_audio(audio_data)

# Clean up GPU memory
if torch.cuda.is_available():
    torch.cuda.empty_cache()
    print("\nFinal GPU state after cleanup:")
    print_gpu_info()

# Save the complete audio file
if all_audio_data:
    try:
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f"speech_{timestamp}.wav")
        
        # Concatenate all audio data with small silences between sentences
        silence = np.zeros(int(22050 * 0.5))  # 0.5 seconds of silence
        final_audio = np.concatenate([np.concatenate([audio, silence]) for audio in all_audio_data])
        
        # Save it
        sf.write(output_file, final_audio, 22050)
        print(f"\nSuccessfully saved complete audio to: {output_file}")
        print(f"Audio shape: {final_audio.shape}")
    except Exception as e:
        print(f"Error saving audio file: {str(e)}")
        print(f"Attempted to save to: {output_file}")
        raise
else:
    print("No audio was generated!")