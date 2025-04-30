import os
import re
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, conversation_store):
        self.conversation_store = conversation_store
        self.service = os.getenv('AI_SERVICE', 'ollama').lower()

    def get_response(self, prompt: str, chat_id: str, max_tokens: Optional[int] = None) -> str:
        """Get AI response using configured service"""
        if self.service == 'n8n':
            return self._get_n8n_response(prompt, chat_id)
        elif self.service == 'ollama':
            return self._get_ollama_response(prompt, chat_id, max_tokens)
        else:
            raise ValueError(f"Unknown AI service: {self.service}")

    def _get_ollama_response(self, prompt: str, chat_id: str, max_tokens: Optional[int] = None) -> str:
        """Get response from Ollama model with GPU acceleration"""
        url = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')

        system_prompt = (
            "You are a helpful and conversational assistant. "
            "Match the length of the user's message most of the time. "
            "Only elaborate if it is necessary to clarify or explain something important. "
            "Be friendly, direct, and natural."
        )

        # Get conversation history within token limit
        history = self.conversation_store.get_history(chat_id, max_tokens)
        history_text = ""
        if history:
            for msg in history:
                role = "User" if msg['type'] == 'user' else "Assistant"
                history_text += f"{role}: {msg['text']}\n"

        logger.info(f"[Ollama] Using history with {len(history) if history else 0} messages")
        logger.debug(f"[Ollama] History text:\n{history_text}")
        logger.info(f"[Ollama] Current prompt: {prompt}")

        full_prompt = f"{system_prompt}\n\n{history_text}User: {prompt}\nAssistant:"

        data = {
            "model": os.getenv('OLLAMA_MODEL', 'deepseek-r1'),
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "num_gpu": 33,  # Use all GPU layers
                "num_thread": 20,  # More CPU threads
                "temperature": 0.7,  # Lower temperature for faster, more focused responses
                "top_p": 0.9,  # Nucleus sampling parameter
                "repeat_penalty": 1.1,  # Penalize repetition
                "num_ctx": max_tokens if max_tokens else 2048  # Use provided context window size
            }
        }
        
        try:
            # Set a reasonable timeout
            response = requests.post(url, json=data, timeout=30)
            response.raise_for_status()  # Raise exception for bad status codes
            
            if response.status_code == 200:
                response_text = response.json()['response']
                # Remove the thinking part enclosed in <think> tags
                response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
                # Clean up any extra newlines and spaces
                response_text = re.sub(r'\n+', ' ', response_text)
                response_text = re.sub(r'\s+', ' ', response_text)
                return response_text.strip()
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
        except requests.exceptions.Timeout:
            raise Exception("Ollama request timed out after 30 seconds")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama API request failed: {str(e)}")

    def _get_n8n_response(self, prompt: str, chat_id: str) -> str:
        """Get response from n8n webhook"""
        url = os.getenv('N8N_WEBHOOK_URL')
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Add authentication if configured
        auth_token = os.getenv('N8N_AUTH_TOKEN')
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        # Handle null input case
        if not prompt or prompt.strip() == '':
            return "I don't understand. Could you please rephrase that?"
        
        data = {
            "sessionId": chat_id,
            "contactMessage": prompt
        }
        
        logger.info(f"Sending to n8n for chat {chat_id}: {data}")
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code == 200:
            response_data = response.json()
            logger.info(f"Received from n8n for chat {chat_id}: {response_data}")
            
            # Extract the agent message from the n8n response
            agent_message = response_data.get('agentMessage', '')
            if not agent_message:
                logger.error(f"No agent message in n8n response: {response_data}")
                raise Exception("No agent message in n8n response")
                
            return agent_message.strip()
        else:
            raise Exception(f"n8n webhook error: {response.status_code}, {response.text}")

    def generate_title(self, messages: list, chat_id: str) -> str:
        """Generate a title for the chat based on conversation history"""
        try:
            # Combine messages into a summary prompt
            conversation = "\n".join([f"{'User' if msg['type'] == 'user' else 'Assistant'}: {msg['text']}" for msg in messages])
            prompt = f"Based on this conversation, generate a brief, descriptive title (max 6 words):\n\n{conversation}"
            
            # Use Ollama for title generation
            url = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
            response = requests.post(url, json={
                "model": os.getenv('OLLAMA_MODEL', 'deepseek-r1'),
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_ctx": 2048
                }
            })
            
            if response.status_code == 200:
                title = response.json()['response'].strip()
                # Remove quotes if present
                title = title.strip('"\'')
                return title
            else:
                logger.error(f"Error generating title: {response.status_code}")
                return "New Chat"
        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return "New Chat" 