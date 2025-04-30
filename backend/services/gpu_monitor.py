import logging
import time
from typing import Optional, Dict
import pynvml
from threading import Thread, Lock

logger = logging.getLogger(__name__)

class GPUMonitor:
    def __init__(self, poll_interval: float = 10.0):
        self._poll_interval = poll_interval
        self._utilization = 0.0
        self._memory_used = 0
        self._memory_total = 0
        self._lock = Lock()
        self._running = False
        self._monitor_thread: Optional[Thread] = None
        
        try:
            pynvml.nvmlInit()
            self._device_count = pynvml.nvmlDeviceGetCount()
            logger.info(f"Initialized GPU monitoring. Found {self._device_count} device(s)")
        except pynvml.NVMLError as e:
            logger.warning(f"Could not initialize NVML: {str(e)}")
            self._device_count = 0

    def start(self) -> None:
        """Start the GPU monitoring thread."""
        if self._running:
            return

        self._running = True
        self._monitor_thread = Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info("GPU monitoring started")

    def stop(self) -> None:
        """Stop the GPU monitoring thread."""
        self._running = False
        if self._monitor_thread:
            self._monitor_thread.join()
            self._monitor_thread = None
        logger.info("GPU monitoring stopped")

    def _monitor_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                self._update_metrics()
            except Exception as e:
                logger.error(f"Error updating GPU metrics: {str(e)}")
            time.sleep(self._poll_interval)

    def _update_metrics(self) -> None:
        """Update GPU metrics."""
        if self._device_count == 0:
            return

        try:
            # We'll monitor the first GPU for now
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            
            # Get utilization
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            gpu_util = float(util.gpu)
            
            # Get memory info
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            mem_used = mem_info.used
            mem_total = mem_info.total
            
            # Update metrics thread-safely
            with self._lock:
                self._utilization = gpu_util
                self._memory_used = mem_used
                self._memory_total = mem_total

        except pynvml.NVMLError as e:
            logger.error(f"Error getting GPU metrics: {str(e)}")

    def get_metrics(self) -> Dict[str, float]:
        """Get current GPU metrics."""
        with self._lock:
            return {
                'utilization': self._utilization,
                'memory_used_mb': self._memory_used / (1024 * 1024),
                'memory_total_mb': self._memory_total / (1024 * 1024),
                'memory_used_pct': (self._memory_used / self._memory_total * 100) if self._memory_total else 0
            }

    def get_utilization(self) -> float:
        """Get current GPU utilization percentage."""
        with self._lock:
            return self._utilization

    def __del__(self):
        """Cleanup on deletion."""
        self.stop()
        try:
            pynvml.nvmlShutdown()
        except:
            pass 