"""
AIOrchestrator - Unified AI Service Layer

Central orchestration point for all AI operations:
- Provider selection (Gemini, OpenAI, Claude)
- Plan-aware model routing
- Metrics logging and usage tracking
- Quota enforcement
- Intelligent caching (system, session, content)
- Error handling and retries

Usage:
    orchestrator = AIOrchestrator(db=db)
    response = await orchestrator.generate(
        user_id=user_id,
        task=TaskType.EXTRACTION,
        prompt=extraction_prompt,
        system_prompt=system_messages,
    )
    
    # With caching:
    response = await orchestrator.generate_cached(
        user_id=user_id,
        task=TaskType.EXTRACTION,
        prompt=extraction_prompt,
        cache_key="job_extraction_abc123",  # Optional cache key
    )
"""

import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert

from app.core.config import get_settings
from app.core.prompts import get_extraction_prompts, get_cv_tailoring_prompts, get_cover_letter_prompts
from app.db.models import User, AIProviderConfig, AIProviderUsageLog
from app.services.universal_provider import ProviderFactory, TaskType, ProviderType
from app.services.model_router import ModelRouter, TASK_EXTRACTION, TASK_CV_DRAFT, TASK_COVER_LETTER

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Centralized AI orchestrator for all LLM operations.
    
    Handles:
    - Provider selection and initialization
    - Plan-aware model routing
    - Usage tracking and quota enforcement
    - Logging and observability
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize the AIOrchestrator.
        
        Args:
            db: AsyncSession for database operations
        """
        self.db = db
        self.settings = get_settings()
        self.model_router = ModelRouter()
        self.provider_factory = ProviderFactory()
        self.metrics: Dict[str, Any] = {}
        
        # Initialize cache manager (lazy load to avoid circular imports)
        self._cache_mgr = None

    async def generate(
        self,
        user_id: int,
        task: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        image_data: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        provider_type: Optional[str] = None,
    ) -> str:
        """
        Generate content through the unified AI pipeline.
        
        Args:
            user_id: User making the request
            task: Task type (extraction, cv_draft, cover_letter, validation)
            prompt: User/system prompt for generation
            system_prompt: Optional system prompt
            image_data: Optional image bytes for multimodal tasks
            mime_type: MIME type of image (default: image/jpeg)
            temperature: Model temperature (0.0-1.0)
            max_tokens: Maximum tokens in response
            provider_type: Override provider (e.g., "gemini"). If None, uses config default.
        
        Returns:
            Generated content as string
        
        Raises:
            HTTPException: If quota exceeded or provider unavailable
        """
        start_time = datetime.utcnow()
        provider_config = None
        
        try:
            # Step 1: Determine which provider config to use
            provider_config = await self._get_provider_config(user_id, provider_type)
            if not provider_config:
                logger.error(f"No active provider config for user {user_id}")
                raise ValueError(f"No active AI provider configured for user {user_id}")
            
            logger.info(f"Using provider config ID={provider_config.id}, model={provider_config.model_name}")
            
            # Step 2: Initialize provider with decrypted credentials
            provider = await self._init_provider(provider_config)
            
            # Step 3: Check usage quotas
            await self._check_quotas(user_id, provider_config.id, task)
            
            # Step 4: Generate content
            if image_data:
                response = await provider.generate_content_with_image(
                    prompt=prompt,
                    image_data=image_data,
                    mime_type=mime_type,
                    system_prompt=system_prompt,
                    temperature=temperature,
                )
            else:
                response = await provider.generate_content(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            
            # Step 5: Log successful usage
            await self._log_usage(
                user_id=user_id,
                provider_config_id=provider_config.id,
                task_type=task,
                status="success",
                response_text=response,
                start_time=start_time,
            )
            
            return response
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"AIOrchestrator generation failed for user {user_id}, task {task}: {error_msg}")
            
            # Attempt fallback with default working model if admin config failed
            if provider_config and provider_config.id != 0:  # If using DB config, try fallback
                try:
                    logger.info(f"Admin provider config (ID={provider_config.id}) failed. Attempting fallback...")
                    
                    # Create fallback with known working model
                    fallback_config = AIProviderConfig(
                        id=0,  # Ephemeral fallback
                        provider_type=provider_config.provider_type,
                        api_key_encrypted=provider_config.api_key_encrypted,
                        model_name="gemini-1.5-pro",  # Known working fallback
                        is_active=True,
                        is_default=False,
                    )
                    
                    fallback_provider = await self._init_provider(fallback_config)
                    logger.info("Fallback provider initialized with gemini-1.5-pro")
                    
                    if image_data:
                        response = await fallback_provider.generate_content_with_image(
                            prompt=prompt,
                            image_data=image_data,
                            mime_type=mime_type,
                            system_prompt=system_prompt,
                            temperature=temperature,
                        )
                    else:
                        response = await fallback_provider.generate_content(
                            prompt=prompt,
                            system_prompt=system_prompt,
                            temperature=temperature,
                            max_tokens=max_tokens,
                        )
                    
                    logger.info(f"Fallback succeeded! Logging with original config ID={provider_config.id}")
                    
                    # Log as success with fallback note
                    await self._log_usage(
                        user_id=user_id,
                        provider_config_id=provider_config.id,
                        task_type=task,
                        status="success_fallback",
                        response_text=response,
                        start_time=start_time,
                    )
                    
                    return response
                    
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {fallback_error}. Original error: {error_msg}")
            
            # Log failed usage
            await self._log_usage(
                user_id=user_id,
                provider_config_id=provider_config.id if provider_config else None,
                task_type=task,
                status="error",
                error_message=error_msg,
                start_time=start_time,
            )
            
            raise

    async def _get_provider_config(
        self,
        user_id: int,
        provider_type_override: Optional[str] = None,
    ) -> Optional[AIProviderConfig]:
        """
        Retrieve active provider config for user.
        
        Falls back to system default if user has no personal config.
        """
        if provider_type_override:
            # If override specified, find that provider
            stmt = select(AIProviderConfig).where(
                (AIProviderConfig.is_active == True) &
                (AIProviderConfig.provider_type == provider_type_override)
            )
        else:
            # Get first active provider (or default)
            stmt = select(AIProviderConfig).where(
                AIProviderConfig.is_active == True
            ).limit(1)
        
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()
        
        if not config:
            logger.warning(f"No active provider config found. Using env defaults.")
            # Fall back to environment-based provider
            return self._create_default_provider_config()
        
        return config

    def _create_default_provider_config(self) -> AIProviderConfig:
        """
        Create a default provider config from environment variables.
        Used as fallback when no DB configs exist.
        """
        # This is a fallback - in production, should have at least one config in DB
        api_key = self.settings.GEMINI_API_KEY
        model_name = self.settings.GEMINI_MODEL_FAST
        
        if not api_key:
            raise ValueError(
                "No active AI provider configured in database and GEMINI_API_KEY not set in environment. "
                "Please either: (1) Add a provider via /admin/providers, or "
                "(2) Set GEMINI_API_KEY in your .env file"
            )
        
        # Create ephemeral config object (not persisted)
        config = AIProviderConfig(
            id=0,  # Ephemeral
            provider_type="gemini",
            api_key_encrypted=api_key,  # Not encrypted for env fallback
            model_name=model_name or "gemini-1.5-pro",
            is_active=True,
            is_default=True,
        )
        return config

    async def _init_provider(self, config: AIProviderConfig):
        """
        Initialize provider with decrypted credentials from config.
        """
        from app.services.encryption_service import decrypt_token
        
        # Decrypt the API key from storage
        # Skip decryption for ephemeral fallback configs (id=0)
        if config.id == 0:
            # Ephemeral config from environment - already plain text
            api_key = config.api_key_encrypted
            logger.info("Using fallback provider from environment variables")
        else:
            # Database config - needs decryption
            try:
                api_key = decrypt_token(config.api_key_encrypted)
                logger.info(f"Using provider from database: {config.provider_type} (ID: {config.id})")
            except Exception as e:
                logger.error(f"Failed to decrypt API key for {config.provider_type}: {e}")
                raise ValueError(f"Invalid provider credentials for {config.provider_type}")
        
        try:
            provider = self.provider_factory.create_provider(
                provider_type=config.provider_type.value if hasattr(config.provider_type, 'value') else config.provider_type,
                api_key=api_key,
                model_name=config.model_name,
            )
        except Exception as e:
            logger.error(f"Failed to create provider {config.provider_type}: {e}")
            raise ValueError(f"Failed to initialize provider {config.provider_type}: {str(e)}")
        
        # Skip credential validation for now - it's slow and may fail unnecessarily
        # The actual API call will validate credentials
        logger.info(f"Provider initialized: {config.provider_type} with model {config.model_name}")
        
        return provider

    async def _check_quotas(
        self,
        user_id: int,
        provider_config_id: int,
        task: str,
    ) -> None:
        """
        Check user quotas (daily/monthly tokens or API calls).
        
        Raises QuotaError if quota exceeded.
        """
        from app.services.quota_manager import QuotaManager, QuotaError
        
        quota_mgr = QuotaManager(db=self.db)
        
        try:
            allowed, message = await quota_mgr.check_quota(
                user_id=user_id,
                task_type=task,
            )
            
            if not allowed:
                logger.warning(f"Quota check failed for user {user_id}: {message}")
                raise QuotaError(message)
                
        except QuotaError as e:
            logger.error(f"Quota exceeded for user {user_id}, task {task}: {e}")
            raise ValueError(f"Quota exceeded: {str(e)}")

    async def _log_usage(
        self,
        user_id: int,
        provider_config_id: Optional[int],
        task_type: str,
        status: str,
        response_text: Optional[str] = None,
        error_message: Optional[str] = None,
        start_time: Optional[datetime] = None,
    ) -> None:
        """
        Log AI usage for metrics, cost tracking, and auditing.
        """
        try:
            latency_ms = None
            if start_time:
                latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Estimate tokens (rough: ~4 chars per token)
            input_tokens = 0
            output_tokens = 0
            
            if response_text:
                output_tokens = len(response_text) // 4
            
            # Calculate cost (Gemini 1.5-pro pricing: $0.075/1M input, $0.30/1M output)
            estimated_cost_usd = (input_tokens * 0.075 + output_tokens * 0.30) / 1_000_000
            estimated_cost_cents = int(estimated_cost_usd * 100)
            
            # For ephemeral configs (id=0), use None for DB logging to skip the constraint
            config_id_for_logging = provider_config_id if provider_config_id and provider_config_id != 0 else None
            
            log_entry = AIProviderUsageLog(
                user_id=user_id,
                provider_config_id=config_id_for_logging,
                task_type=task_type,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
                estimated_cost_usd=estimated_cost_cents,  # Store in cents
                status=status,
                error_message=error_message,
                latency_ms=latency_ms,
            )
            
            self.db.add(log_entry)
            await self.db.flush()
            
            logger.info(
                f"Usage logged: user={user_id}, task={task_type}, status={status}, "
                f"tokens={input_tokens + output_tokens}, latency={latency_ms}ms"
            )
            
        except Exception as e:
            logger.error(f"Failed to log AI usage: {e}")
            # Don't raise - logging failure shouldn't break the request


    @property
    def cache_mgr(self):
        """Lazy-load cache manager to avoid circular imports."""
        if self._cache_mgr is None:
            from app.services.cache_manager import CacheManager
            self._cache_mgr = CacheManager(db=self.db)
        return self._cache_mgr

    async def generate_cached(
        self,
        user_id: int,
        task: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        cache_key: Optional[str] = None,
        skip_cache: bool = False,
        image_data: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        provider_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate content with intelligent caching.
        
        Checks cache first, returns cached response if available.
        On cache miss, generates and stores in cache for future use.
        
        Args:
            user_id: User making the request
            task: Task type (extraction, cv_draft, cover_letter)
            prompt: User/system prompt for generation
            system_prompt: Optional system prompt
            cache_key: Optional cache key (auto-generated if not provided)
            skip_cache: Force skip cache and regenerate
            image_data: Optional image bytes for multimodal tasks
            mime_type: MIME type of image
            temperature: Model temperature (0.0-1.0)
            max_tokens: Maximum tokens in response
            provider_type: Override provider
        
        Returns:
            Dict with keys:
            - response: Generated content
            - cached: Boolean (true if from cache)
            - cost_saved: Estimated USD saved by using cache
            - cache_hit_time: Time saved by avoiding generation
        """
        from app.services.cache_manager import CacheType
        import hashlib
        
        # Generate cache key if not provided
        if not cache_key:
            key_data = f"{task}_{prompt[:100]}"
            cache_key = hashlib.sha256(key_data.encode()).hexdigest()[:24]
        
        # Try cache first (unless skipped)
        if not skip_cache:
            cached = await self.cache_mgr.get_cache(
                key=cache_key,
                user_id=user_id,
                cache_type=CacheType.SESSION,
            )
            
            if cached:
                logger.info(f"Cache hit for {cache_key}, user={user_id}")
                return {
                    "response": cached["data"]["response"],
                    "cached": True,
                    "cost_saved_usd": cached.get("saved_cost_usd", 0),
                    "cache_created_at": cached.get("created_at"),
                }
        
        # Cache miss or skipped - generate new response
        logger.info(f"Cache miss for {cache_key}, generating new content")
        
        response = await self.generate(
            user_id=user_id,
            task=task,
            prompt=prompt,
            system_prompt=system_prompt,
            image_data=image_data,
            mime_type=mime_type,
            temperature=temperature,
            max_tokens=max_tokens,
            provider_type=provider_type,
        )
        
        # Store in cache for future use
        await self.cache_mgr.set_session_cache(
            user_id=user_id,
            key=cache_key,
            content={"response": response},
            ttl_minutes=None,  # Use plan default
            metadata={
                "task": task,
                "temperature": temperature,
                "model": provider_type or "default",
            },
        )
        
        return {
            "response": response,
            "cached": False,
            "cost_saved_usd": 0,
            "cache_created_at": datetime.utcnow().isoformat(),
        }

    async def cache_system_prompt(
        self,
        prompt_key: str,
        content: str,
        description: Optional[str] = None,
    ) -> bool:
        """
        Cache a permanent system prompt (e.g., CV drafting rules).
        
        System caches never expire and are shared across all users.
        Use this for rules, formatting templates, ATS keywords, etc.
        
        Args:
            prompt_key: Unique key (e.g., "cv_drafting_system")
            content: Prompt content to cache
            description: Optional metadata about the prompt
        
        Returns:
            True if cached successfully
        """
        return await self.cache_mgr.set_system_cache(
            key=prompt_key,
            content={"text": content},
            metadata={
                "description": description,
                "version": 1,
            },
        )

    async def get_system_prompt_from_cache(self, prompt_key: str) -> Optional[str]:
        """
        Retrieve a cached system prompt.
        
        Returns:
            Prompt text or None if not cached
        """
        from app.services.cache_manager import CacheType
        cached = await self.cache_mgr.get_cache(
            key=prompt_key,
            cache_type=CacheType.SYSTEM,
        )
        
        if cached:
            return cached.get("data", {}).get("text")
        return None

    async def get_cache_stats(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Get cache statistics for monitoring."""
        return await self.cache_mgr.get_cache_stats(user_id=user_id)


# Module-level convenience functions
async def extract_job_data(
    db: AsyncSession,
    user_id: int,
    prompt: str,
    image_data: Optional[bytes] = None,
) -> str:
    """Extract job data using orchestrator."""
    orchestrator = AIOrchestrator(db=db)
    system_prompt = get_extraction_prompts().get("system", "")
    
    return await orchestrator.generate(
        user_id=user_id,
        task=TASK_EXTRACTION,
        prompt=prompt,
        system_prompt=system_prompt,
        image_data=image_data,
        temperature=0.3,  # Lower temp for structured extraction
        max_tokens=2048,
    )


async def draft_cv(
    db: AsyncSession,
    user_id: int,
    master_profile: Dict[str, Any],
    job_data: Dict[str, Any],
) -> str:
    """Draft CV using orchestrator."""
    orchestrator = AIOrchestrator(db=db)
    
    prompts = get_cv_tailoring_prompts()
    system_prompt = prompts.get("system", "")
    
    # Build prompt from profile and job
    prompt = prompts.get("template", "").format(
        master_profile=json.dumps(master_profile, indent=2),
        job_data=json.dumps(job_data, indent=2),
    )
    
    return await orchestrator.generate(
        user_id=user_id,
        task=TASK_CV_DRAFT,
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.5,
        max_tokens=4096,
    )


async def draft_cover_letter(
    db: AsyncSession,
    user_id: int,
    master_profile: Dict[str, Any],
    job_data: Dict[str, Any],
) -> str:
    """Draft cover letter using orchestrator."""
    orchestrator = AIOrchestrator(db=db)
    
    prompts = get_cover_letter_prompts()
    system_prompt = prompts.get("system", "")
    
    # Build prompt from profile and job
    prompt = prompts.get("template", "").format(
        master_profile=json.dumps(master_profile, indent=2),
        job_data=json.dumps(job_data, indent=2),
    )
    
    return await orchestrator.generate(
        user_id=user_id,
        task=TASK_COVER_LETTER,
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.6,
        max_tokens=1024,
    )
