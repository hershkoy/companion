import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid
from ..models.document import Document
from ..models.chunk import DocumentChunk
from ..services.model_manager import ModelManager
from ..services.chroma_client import ChromaClient

logger = logging.getLogger(__name__)

class IndexingTask:
    def __init__(self,
                 model_manager: ModelManager,
                 chroma_client: ChromaClient,
                 chunk_size: int = 500):
        self._model_manager = model_manager
        self._chroma_client = chroma_client
        self._chunk_size = chunk_size

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into chunks of approximately chunk_size tokens."""
        # Simple splitting by newlines and approximate token count
        # TODO: Use proper tokenizer for more accurate splits
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = []
        current_size = 0
        
        for para in paragraphs:
            # Rough estimate: 4 chars ≈ 1 token
            para_size = len(para) // 4
            
            if current_size + para_size > self._chunk_size:
                # Current chunk is full, start new one
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                current_chunk = [para]
                current_size = para_size
            else:
                # Add to current chunk
                current_chunk.append(para)
                current_size += para_size
        
        # Add final chunk
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))
            
        return chunks

    def _process_document(self,
                         doc: Document,
                         embedder_name: str,
                         cancel_check = None
                         ) -> List[DocumentChunk]:
        """Process a single document into chunks with embeddings."""
        logger.info(f"Processing document: {doc.doc_id}")
        
        # Read document content
        # TODO: Implement different readers based on source_type
        with open(doc.source_path, 'r') as f:
            content = f.read()
            
        # Split into chunks
        text_chunks = self._chunk_text(content)
        
        # Generate embeddings
        embedder = self._model_manager.load_embedder(embedder_name)
        chunks = []
        
        for i, text in enumerate(text_chunks):
            # Check for cancellation
            if cancel_check and cancel_check():
                logger.info(f"Cancelling processing of document {doc.doc_id}")
                return chunks
                
            # Generate chunk ID and embedding
            chunk_id = f"chunk-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
            embedding = embedder.encode(text).tolist()
            
            # Create chunk object
            chunk = DocumentChunk(
                chunk_id=chunk_id,
                doc_id=doc.doc_id,
                chunk_index=i,
                text=text,
                chroma_id=f"{doc.doc_id}:{i}",
                created_at=datetime.now()
            )
            
            # Prepare for Chroma
            chunks.append({
                'chunk': chunk,
                'embedding': embedding
            })
            
        return chunks

    def process_documents(self,
                         docs: List[Document],
                         embedder_name: str,
                         cancel_check = None
                         ) -> None:
        """Process multiple documents and update vector store."""
        for doc in docs:
            try:
                # Process document
                chunk_data = self._process_document(doc, embedder_name, cancel_check)
                
                if not chunk_data or (cancel_check and cancel_check()):
                    break
                
                # Prepare chunks for Chroma
                chroma_chunks = [{
                    'chroma_id': data['chunk'].chroma_id,
                    'text': data['chunk'].text,
                    'embedding': data['embedding'],
                    'metadata': {
                        'doc_id': doc.doc_id,
                        'chunk_index': data['chunk'].chunk_index,
                        'source_type': doc.source_type
                    }
                } for data in chunk_data]
                
                # Update vector store
                self._chroma_client.upsert_chunks(chroma_chunks)
                
                # TODO: Save chunks to database
                
            except Exception as e:
                logger.error(f"Error processing document {doc.doc_id}: {str(e)}")
                continue 