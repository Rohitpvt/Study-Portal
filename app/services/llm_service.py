import logging
import asyncio
from typing import Optional, List, Dict
from openai import AsyncOpenAI, APIConnectionError, APITimeoutError, RateLimitError
from app.core.config import settings
from app.services.key_manager import nvidia_key_manager

logger = logging.getLogger(__name__)

PRIMARY_MODEL = "meta/llama-3.1-70b-instruct"
FALLBACK_MODEL = "meta/llama-3.1-8b-instruct"

async def get_ai_response(prompt: str) -> str:
    """
    Backward-compatible wrapper for single-prompt AI queries.
    Converts a single string into a message list.
    """
    messages = [{"role": "user", "content": prompt}]
    return await get_chat_response(messages)

async def get_chat_response(messages: List[Dict[str, str]]) -> str:
    """
    Fetches an AI response from NVIDIA NIM using a full conversation history.
    Includes fail-safe, automatic key rotation, and model fallback logic.
    """
    if not nvidia_key_manager.get_current_key():
        logger.error("No NVIDIA API keys configured. AI service unavailable.")
        return "AI service is currently unconfigured."

    # First Attempt: Primary Model (70B) with automatic key rotation
    try:
        return await _call_llm_resilient(PRIMARY_MODEL, messages)
    except Exception as e:
        logger.warning(f"Primary model {PRIMARY_MODEL} failed after all key attempts: {e}. Attempting fallback...")
        return await _handle_fallback(messages)

async def _handle_fallback(messages: List[Dict[str, str]]) -> str:
    """Attempt fallback to the smaller/faster model (8B) with key rotation."""
    try:
        logger.info(f"Invoking resilient fallback LLM: {FALLBACK_MODEL}")
        return await _call_llm_resilient(FALLBACK_MODEL, messages)
    except Exception as e:
        logger.error(f"Fallback model {FALLBACK_MODEL} also failed with all keys: {e}")
        return "AI is temporarily unavailable due to high demand. Please try again in a few moments."

async def _call_llm_resilient(model: str, messages: List[Dict[str, str]]) -> str:
    """
    Internal helper to execute chat completion with automatic key rotation.
    Retries the request if a quota or rate-limit error occurs.
    """
    max_attempts = nvidia_key_manager.total_keys
    
    for attempt in range(max_attempts):
        api_key = nvidia_key_manager.get_current_key()
        masked_key = nvidia_key_manager.get_masked_key()
        
        try:
            logger.info(f"Attempting {model} (Attempt {attempt+1}/{max_attempts}) using key: {masked_key}")
            
            # Create a per-request client with the current key
            client = AsyncOpenAI(
                base_url=settings.NVIDIA_BASE_URL,
                api_key=api_key
            )
            
            return await _call_llm_inner(client, model, messages)
            
        except RateLimitError as e:
            logger.warning(f"Rate limit / Quota reached for key {masked_key}: {e}")
            if attempt < max_attempts - 1:
                nvidia_key_manager.rotate_key()
                continue
            raise
        except Exception as e:
            # Check for common quota-related strings in generic exceptions
            err_msg = str(e).lower()
            quota_triggers = ["quota exceeded", "insufficient credits", "limit reached", "usage limit"]
            if any(trigger in err_msg for trigger in quota_triggers):
                logger.warning(f"Provider-side limit detected for key {masked_key}: {e}")
                if attempt < max_attempts - 1:
                    nvidia_key_manager.rotate_key()
                    continue
            
            # For other errors (connectivity, bad request), don't rotate if it's likely a persistent issue
            raise

async def _call_llm_inner(client: AsyncOpenAI, model: str, messages: List[Dict[str, str]]) -> str:
    """Raw execution of the OpenAI-compatible chat completion."""
    # Ensure system prompt is present if not already in messages
    has_system = any(m["role"] == "system" for m in messages)
    if not has_system:
         messages_copy = [{"role": "system", "content": "You are a professional academic AI assistant for Christ University students. Provide precise, helpful, and high-quality study insights."}] + messages
    else:
         messages_copy = messages

    response = await client.chat.completions.create(
        model=model,
        messages=messages_copy,
        temperature=0.6,
        max_tokens=800,
        timeout=15.0  # Slightly increased timeout for resilience
    )
    return response.choices[0].message.content
