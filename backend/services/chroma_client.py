import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
import numpy as np

logger = logging.getLogger(__name__)

class ChromaClient:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self._persist_directory = persist_directory
        self._client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            is_persistent=True
        ))
        self._collection = self._client.get_or_create_collection(
            name="document_chunks",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Initialized ChromaDB client with persistence at {persist_directory}")

    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Upsert chunks into the vector store.
        
        Args:
            chunks: List of dicts with keys:
                - chroma_id: str
                - embedding: List[float]
                - text: str
                - metadata: Dict (optional)
        """
        if not chunks:
            return

        # Prepare data for bulk upsert
        ids = []
        embeddings = []
        documents = []
        metadatas = []

        for chunk in chunks:
            ids.append(chunk['chroma_id'])
            embeddings.append(chunk['embedding'])
            documents.append(chunk['text'])
            metadatas.append(chunk.get('metadata', {}))

        try:
            self._collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"Upserted {len(chunks)} chunks into ChromaDB")
        except Exception as e:
            logger.error(f"Error upserting chunks: {str(e)}")
            raise

    def query(self, 
             embedding: List[float], 
             top_k: int = 5,
             where: Optional[Dict[str, Any]] = None
             ) -> List[Dict[str, Any]]:
        """
        Query the vector store for similar chunks.
        
        Args:
            embedding: Query embedding vector
            top_k: Number of results to return
            where: Optional filter conditions
            
        Returns:
            List of dicts with keys:
                - chroma_id: str
                - text: str
                - metadata: Dict
                - distance: float
        """
        try:
            # Convert embedding to numpy array for consistency
            query_embedding = np.array(embedding).reshape(1, -1)
            
            # Execute query
            results = self._collection.query(
                query_embeddings=query_embedding,
                n_results=top_k,
                where=where
            )
            
            # Format results
            formatted_results = []
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    'chroma_id': results['ids'][0][i],
                    'text': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': float(results['distances'][0][i])
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error querying ChromaDB: {str(e)}")
            raise

    def delete_chunks(self, chunk_ids: List[str]) -> None:
        """Delete chunks from the vector store."""
        try:
            self._collection.delete(ids=chunk_ids)
            logger.info(f"Deleted {len(chunk_ids)} chunks from ChromaDB")
        except Exception as e:
            logger.error(f"Error deleting chunks: {str(e)}")
            raise

    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection."""
        try:
            count = self._collection.count()
            return {
                'total_chunks': count,
                'collection_name': self._collection.name,
                'persist_directory': self._persist_directory
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            raise 