import logging
from typing import Optional, Dict, Any
from langchain.llms import Ollama
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class ModelManager:
    def __init__(self):
        self._current_chat_model: Optional[Ollama] = None
        self._current_embedder: Optional[SentenceTransformer] = None
        self._chat_model_name: Optional[str] = None
        self._embedder_name: Optional[str] = None

    @property
    def current_chat_model(self) -> Optional[Ollama]:
        return self._current_chat_model

    @property
    def current_embedder(self) -> Optional[SentenceTransformer]:
        return self._current_embedder

    def load_chat_model(self, name: str) -> Ollama:
        """Load a chat model using Ollama."""
        if self._current_chat_model and self._chat_model_name == name:
            return self._current_chat_model

        logger.info(f"Loading chat model: {name}")
        try:
            # Unload current model if different
            if self._current_chat_model and self._chat_model_name != name:
                self.unload_chat_model()

            # Initialize new Ollama model
            model = Ollama(model=name)
            self._current_chat_model = model
            self._chat_model_name = name
            return model

        except Exception as e:
            logger.error(f"Error loading chat model {name}: {str(e)}")
            raise

    def unload_chat_model(self) -> None:
        """Unload the current chat model."""
        if self._current_chat_model:
            logger.info(f"Unloading chat model: {self._chat_model_name}")
            # Ollama doesn't have explicit unload, but we can clear our reference
            self._current_chat_model = None
            self._chat_model_name = None

    def load_embedder(self, name: str) -> SentenceTransformer:
        """Load an embedding model."""
        if self._current_embedder and self._embedder_name == name:
            return self._current_embedder

        logger.info(f"Loading embedder: {name}")
        try:
            # Unload current embedder if different
            if self._current_embedder and self._embedder_name != name:
                self.unload_embedder()

            # Initialize new SentenceTransformer
            model = SentenceTransformer(name)
            self._current_embedder = model
            self._embedder_name = name
            return model

        except Exception as e:
            logger.error(f"Error loading embedder {name}: {str(e)}")
            raise

    def unload_embedder(self) -> None:
        """Unload the current embedding model."""
        if self._current_embedder:
            logger.info(f"Unloading embedder: {self._embedder_name}")
            # Clear reference to allow garbage collection
            self._current_embedder = None
            self._embedder_name = None

    def swap_to_embedder(self, name: str) -> None:
        """Unload chat model and load embedder."""
        self.unload_chat_model()
        self.load_embedder(name)

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about currently loaded models."""
        return {
            'chat_model': {
                'name': self._chat_model_name,
                'loaded': self._current_chat_model is not None
            },
            'embedder': {
                'name': self._embedder_name,
                'loaded': self._current_embedder is not None
            }
        } 