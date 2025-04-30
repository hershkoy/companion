import logging
import subprocess
import torch
import numpy as np
import soundfile as sf
import base64
import tempfile
import os
from typing import List, Optional, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

class AudioService:
    def __init__(self, whisper_model, kokoro_pipeline):
        self.whisper_model = whisper_model
        self.kokoro_pipeline = kokoro_pipeline

    def convert_webm_to_wav(self, input_path: str, output_path: str) -> bool:
        """Convert webm file to wav using ffmpeg"""
        try:
            subprocess.run([
                'ffmpeg', '-i', input_path,
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                '-y',  # Overwrite output file if it exists
                output_path
            ], check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr.decode()}")
            return False

    def process_sentence(self, sentence: str) -> Optional[np.ndarray]:
        """Process a single sentence with Kokoro and return the audio data"""
        logger.info(f"Processing TTS: {sentence[:50]}...")
        
        # Add proper punctuation if needed
        if not sentence.strip().endswith(('.', '!', '?')):
            sentence = sentence + "."
        
        try:
            # Generate speech for this sentence
            audio_chunks = []
            audio_generator = self.kokoro_pipeline(sentence, voice="af_heart", speed=1.5)
            
            for chunk in audio_generator:
                # Get the audio data from the Result object
                if hasattr(chunk, 'audio'):
                    chunk_data = chunk.audio
                else:
                    chunk_data = chunk

                # Convert to CUDA if available
                if isinstance(chunk_data, torch.Tensor):
                    if torch.cuda.is_available() and not chunk_data.is_cuda:
                        chunk_data = chunk_data.cuda()
                    if chunk_data.is_cuda:
                        chunk_data = chunk_data.cpu()
                    chunk_data = chunk_data.detach().numpy()
                
                # Ensure correct data type
                chunk_data = np.asarray(chunk_data, dtype=np.float32)
                audio_chunks.append(chunk_data.flatten())

            if audio_chunks:
                return np.concatenate(audio_chunks)
            return None
        except Exception as e:
            logger.error(f"Error processing TTS for sentence: {str(e)}")
            return None

    def process_text_to_speech(self, text: str, max_workers: int = None) -> List[Dict[str, str]]:
        """Process text to speech with parallel sentence processing"""
        if max_workers is None:
            max_workers = 2 if torch.cuda.is_available() else 4

        # Split response into sentences
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        wav_files = []  # Keep track of temporary wav files
        results = []

        try:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_sentence = {
                    executor.submit(self.process_sentence, sentence): i 
                    for i, sentence in enumerate(sentences)
                }
                
                # Process completed sentences as they finish
                for future in as_completed(future_to_sentence):
                    sentence_idx = future_to_sentence[future]
                    try:
                        audio_data = future.result()
                        if audio_data is not None:
                            # Create unique temporary wav file
                            wav_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
                            wav_files.append(wav_file.name)
                            sf.write(wav_file.name, audio_data, 22050)
                            
                            # Read and encode the audio file
                            with open(wav_file.name, 'rb') as audio_file:
                                audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
                            
                            results.append({
                                'text': sentences[sentence_idx],
                                'audio': audio_base64
                            })
                    except Exception as e:
                        logger.error(f"Error processing sentence {sentence_idx + 1}: {str(e)}")

        finally:
            # Clean up wav files
            for wav_file in wav_files:
                try:
                    if os.path.exists(wav_file):
                        os.unlink(wav_file)
                except Exception as e:
                    logger.warning(f"Could not delete temporary wav file {wav_file}: {e}")

        return results

    def transcribe_audio(self, audio_file_path: str) -> tuple:
        """Transcribe audio using Whisper"""
        segments, info = self.whisper_model.transcribe(
            audio_file_path,
            beam_size=5,
            language="en",
            task="transcribe"
        )
        transcription = " ".join(segment.text for segment in segments)
        return transcription.strip(), info 