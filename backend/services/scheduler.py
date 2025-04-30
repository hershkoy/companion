import logging
import time
from datetime import datetime
from threading import Thread, Event, Lock
from typing import Optional, Dict, Any
from .gpu_monitor import GPUMonitor
from .model_manager import ModelManager
from ..models.session_config import SessionConfig

logger = logging.getLogger(__name__)

class Scheduler:
    def __init__(self,
                 gpu_monitor: GPUMonitor,
                 model_manager: ModelManager,
                 poll_interval: float = 30.0,
                 gpu_threshold: float = 10.0):
        self._gpu_monitor = gpu_monitor
        self._model_manager = model_manager
        self._poll_interval = poll_interval
        self._gpu_threshold = gpu_threshold
        
        self._last_activity = datetime.now()
        self._is_indexing = False
        self._cancel_event = Event()
        self._lock = Lock()
        self._scheduler_thread: Optional[Thread] = None
        self._running = False

    def start(self) -> None:
        """Start the scheduler thread."""
        if self._running:
            return
            
        self._running = True
        self._scheduler_thread = Thread(target=self._scheduler_loop, daemon=True)
        self._scheduler_thread.start()
        logger.info("Indexing scheduler started")

    def stop(self) -> None:
        """Stop the scheduler thread."""
        self._running = False
        if self._scheduler_thread:
            self._scheduler_thread.join()
            self._scheduler_thread = None
        logger.info("Indexing scheduler stopped")

    def record_activity(self) -> None:
        """Record user activity to reset idle timer."""
        with self._lock:
            self._last_activity = datetime.now()

    def _scheduler_loop(self) -> None:
        """Main scheduler loop checking for idle conditions."""
        while self._running:
            try:
                self._check_conditions()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
            time.sleep(self._poll_interval)

    def _check_conditions(self) -> None:
        """Check if conditions are met to start indexing."""
        with self._lock:
            # Skip if already indexing
            if self._is_indexing:
                return
                
            # Check GPU utilization
            gpu_util = self._gpu_monitor.get_utilization()
            if gpu_util >= self._gpu_threshold:
                return
                
            # Check idle time
            idle_seconds = (datetime.now() - self._last_activity).total_seconds()
            if idle_seconds < SessionConfig().idle_threshold_s:  # Use default config
                return
                
            # All conditions met, start indexing
            self._start_indexing()

    def _start_indexing(self) -> None:
        """Start the indexing process."""
        self._is_indexing = True
        self._cancel_event.clear()
        
        try:
            # TODO: Get list of documents needing indexing
            # For now, just simulate indexing
            logger.info("Starting background indexing")
            
            # Swap to deep embedder
            current_info = self._model_manager.get_model_info()
            if current_info['chat_model']['loaded']:
                self._model_manager.swap_to_embedder(SessionConfig().embed_deep)
            
            # TODO: Process documents
            time.sleep(5)  # Simulate work
            
            if self._cancel_event.is_set():
                logger.info("Indexing cancelled")
                return
                
            logger.info("Background indexing completed")
            
        except Exception as e:
            logger.error(f"Error during indexing: {str(e)}")
        finally:
            self._is_indexing = False

    def cancel_indexing(self) -> None:
        """Cancel any running indexing job."""
        if self._is_indexing:
            self._cancel_event.set()
            logger.info("Indexing cancellation requested")

    def get_status(self) -> Dict[str, Any]:
        """Get current scheduler status."""
        with self._lock:
            return {
                'is_indexing': self._is_indexing,
                'last_activity': self._last_activity.isoformat(),
                'idle_seconds': (datetime.now() - self._last_activity).total_seconds()
            } 