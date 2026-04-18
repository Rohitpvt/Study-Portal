import logging
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class KeyManager:
    """
    Manages a pool of NVIDIA API keys with rotation logic.
    Tracks the current active key and provides masked keys for logging.
    """
    def __init__(self, keys: List[str]):
        self.keys = keys
        self.current_index = 0
        self.total_keys = len(keys)
        
        if self.total_keys == 0:
            logger.error("KeyManager initialized with zero keys. NVIDIA NIM service will fail.")

    def get_current_key(self) -> Optional[str]:
        """Returns the currently active API key."""
        if self.total_keys == 0:
            return None
        return self.keys[self.current_index]

    def rotate_key(self) -> str:
        """
        Rotates to the next available API key.
        Returns the now-active key.
        """
        if self.total_keys <= 1:
            logger.info("Key rotation triggered but only 1 key available. Staying on current key.")
            return self.get_current_key()

        old_index = self.current_index
        self.current_index = (self.current_index + 1) % self.total_keys
        
        logger.info(
            f"NVIDIA API Key Rotation: Switched from key[{old_index}] to key[{self.current_index}]. "
            f"New active key: {self.get_masked_key(self.current_index)}"
        )
        return self.get_current_key()

    def get_masked_key(self, index_or_key: Optional[int | str] = None) -> str:
        """
        Returns a masked version of a key for safe logging.
        Format: nvapi-...[last 4 chars]
        """
        key = None
        if index_or_key is None:
            key = self.get_current_key()
        elif isinstance(index_or_key, int):
            if 0 <= index_or_key < self.total_keys:
                key = self.keys[index_or_key]
        else:
            key = index_or_key

        if not key or not isinstance(key, str):
            return "N/A"
            
        # NVIDIA keys usually start with nvapi-
        prefix = "nvapi-" if key.startswith("nvapi-") else ""
        return f"{prefix}...{key[-4:]}"

    def get_all_keys(self) -> List[str]:
        return self.keys

# Singleton instance
nvidia_key_manager = KeyManager(settings.NVIDIA_API_KEYS)
