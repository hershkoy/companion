import logging
from typing import List, Dict, Any, Optional
from .model_manager import ModelManager
from .chroma_client import ChromaClient
from ..models.session_config import SessionConfig

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, model_manager: ModelManager, chroma_client: ChromaClient):
        self._model_manager = model_manager
        self._chroma_client = chroma_client

    def _run_chain_of_thought(self, 
                            prompt: str, 
                            model_name: str,
                            max_iterations: int = 3
                            ) -> str:
        """Run chain-of-thought reasoning iterations."""
        chat_model = self._model_manager.load_chat_model(model_name)
        
        # Initial CoT prompt
        cot_prompt = "Let me think about this step by step:\n\n" + prompt
        
        thoughts = []
        for i in range(max_iterations):
            # Get next thought
            response = chat_model(cot_prompt)
            thoughts.append(response)
            
            # Check if we've reached a conclusion
            if any(word in response.lower() for word in ['therefore', 'conclusion', 'finally']):
                break
                
            # Prepare next iteration
            cot_prompt = f"Based on these thoughts:\n{' '.join(thoughts)}\n\nLet me continue thinking:"
        
        # Generate final response incorporating thoughts
        final_prompt = f"""Based on this chain of reasoning:
{' '.join(thoughts)}

Please provide a clear and concise final response."""
        
        return chat_model(final_prompt)

    def _retrieve_relevant_chunks(self,
                                query: str,
                                config: SessionConfig
                                ) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks using the light embedder."""
        # Load light embedder and generate query embedding
        embedder = self._model_manager.load_embedder(config.embed_light)
        query_embedding = embedder.encode(query).tolist()
        
        # Query Chroma
        return self._chroma_client.query(
            embedding=query_embedding,
            top_k=config.top_k
        )

    def _build_rag_prompt(self,
                         query: str,
                         chunks: List[Dict[str, Any]]
                         ) -> str:
        """Build RAG prompt with retrieved context."""
        context_str = "\n\n".join([
            f"Context {i+1}:\n{chunk['text']}"
            for i, chunk in enumerate(chunks)
        ])
        
        return f"""Please help me answer this question: {query}

Here is some relevant context to help you:

{context_str}

Based on this context and your knowledge, please provide a detailed answer."""

    def generate_response(self,
                         session_id: str,
                         user_message: str,
                         config: SessionConfig
                         ) -> str:
        """Generate response using specified thinking mode."""
        try:
            if config.thinking_mode == "cot":
                # Pure chain-of-thought
                return self._run_chain_of_thought(user_message, config.model_name)
                
            elif config.thinking_mode == "rag":
                # Pure retrieval-augmented
                chunks = self._retrieve_relevant_chunks(user_message, config)
                prompt = self._build_rag_prompt(user_message, chunks)
                chat_model = self._model_manager.load_chat_model(config.model_name)
                return chat_model(prompt)
                
            else:  # hybrid
                # First retrieve context
                chunks = self._retrieve_relevant_chunks(user_message, config)
                prompt = self._build_rag_prompt(user_message, chunks)
                
                # Then run chain-of-thought with context
                return self._run_chain_of_thought(prompt, config.model_name)
                
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise 