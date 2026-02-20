"""
Universal AI Provider System
Supports swapping between Gemini, OpenAI, Claude via configuration
"""

from enum import Enum
from typing import Any, Dict, Optional, List
from abc import ABC, abstractmethod
import json
import logging

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Supported AI provider types."""
    GEMINI = "gemini"
    OPENAI = "openai"
    CLAUDE = "claude"


class TaskType(str, Enum):
    """AI task types for provider routing."""
    EXTRACTION = "extraction"
    CV_DRAFT = "cv_draft"
    COVER_LETTER = "cover_letter"
    VALIDATION = "validation"  # Image/content validation


class AIProvider(ABC):
    """Base class for AI providers."""

    @abstractmethod
    async def generate_content(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> str:
        """Generate content using the provider."""
        pass

    @abstractmethod
    async def generate_content_with_image(
        self,
        prompt: str,
        image_data: bytes,
        mime_type: str = "image/jpeg",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate content with image input (multimodal)."""
        pass

    @abstractmethod
    def validate_credentials(self) -> bool:
        """Validate that credentials are properly set."""
        pass


class GeminiProvider(AIProvider):
    """Google Gemini AI provider."""
    
    # Fallback models to try if primary model fails
    # These are the currently available Gemini models as of Feb 2026
    FALLBACK_MODELS = [
        "models/gemini-2.5-flash",
        "models/gemini-2.5-pro",
        "models/gemini-2.5-flash-lite",
        "models/gemini-3-flash-preview-12-2025",
    ]

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-pro"):
        import google.generativeai as genai

        self.genai = genai
        self.api_key = api_key
        # Store both raw and formatted model names
        self.model_name_raw = model_name  # For logging/debugging
        # Ensure models/ prefix for API calls
        self.model_name = self._format_model_name(model_name)
        self.genai.configure(api_key=api_key)
        logger.info(f"GeminiProvider initialized with model: {self.model_name} (provided: {model_name})")
    
    @staticmethod
    def _format_model_name(model_name: str) -> str:
        """Ensure model name has models/ prefix for Gemini API."""
        if not model_name.startswith("models/"):
            return f"models/{model_name}"
        return model_name
    
    async def _try_model(self, model_name: str, prompt: str, **kwargs) -> Optional[str]:
        """Try to generate with a specific model. Returns None if model unavailable."""
        try:
            model = self.genai.GenerativeModel(
                model_name,
                generation_config=self.genai.types.GenerationConfig(**kwargs),
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")
            return None
    
    async def _try_model_with_image(self, model_name: str, prompt: str, image, **kwargs) -> Optional[str]:
        """Try to generate with image using a specific model."""
        try:
            model = self.genai.GenerativeModel(
                model_name,
                generation_config=self.genai.types.GenerationConfig(**kwargs),
            )
            response = model.generate_content([prompt, image])
            return response.text
        except Exception as e:
            logger.warning(f"Model {model_name} with image failed: {e}")
            return None

    async def generate_content(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> str:
        """Generate content using Gemini with fallback support."""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        gen_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        # Try primary model first
        logger.info(f"Attempting generation with primary model: {self.model_name}")
        result = await self._try_model(
            self.model_name,
            full_prompt,
            **gen_config
        )
        
        if result:
            logger.info(f"✓ Generation succeeded with {self.model_name}")
            return result
        
        # Try fallback models
        logger.warning(f"Primary model {self.model_name} failed. Trying fallbacks...")
        for fallback_model in self.FALLBACK_MODELS:
            if fallback_model == self.model_name:
                continue  # Skip if same as primary
            
            logger.info(f"Attempting fallback model: {fallback_model}")
            result = await self._try_model(
                fallback_model,
                full_prompt,
                **gen_config
            )
            
            if result:
                logger.info(f"✓ Generation succeeded with fallback model: {fallback_model}")
                return result
        
        # All models failed
        raise Exception(
            f"Generation failed with primary model ({self.model_name}) "
            f"and all fallbacks. Please verify model availability."
        )

    async def generate_content_with_image(
        self,
        prompt: str,
        image_data: bytes,
        mime_type: str = "image/jpeg",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate content with image input using Gemini with fallback support."""
        try:
            from PIL import Image
            import io
            
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            gen_config = {"temperature": temperature}
            
            # Try primary model first
            logger.info(f"Attempting multimodal generation with: {self.model_name}")
            result = await self._try_model_with_image(
                self.model_name,
                full_prompt,
                image,
                **gen_config
            )
            
            if result:
                logger.info(f"✓ Multimodal generation succeeded with {self.model_name}")
                return result
            
            # Try fallback models
            logger.warning(f"Primary model {self.model_name} failed. Trying fallbacks...")
            for fallback_model in self.FALLBACK_MODELS:
                if fallback_model == self.model_name:
                    continue
                
                logger.info(f"Attempting multimodal fallback: {fallback_model}")
                result = await self._try_model_with_image(
                    fallback_model,
                    full_prompt,
                    image,
                    **gen_config
                )
                
                if result:
                    logger.info(f"✓ Multimodal generation succeeded with fallback: {fallback_model}")
                    return result
            
            # All models failed
            raise Exception(
                f"Multimodal generation failed with primary model ({self.model_name}) "
                f"and all fallbacks. Please verify model availability."
            )
            
        except Exception as e:
            logger.error(f"Gemini multimodal generation failed: {e}")
            raise

    def validate_credentials(self) -> bool:
        """
        Validate Gemini API key and model availability.
        Uses the configured model name for testing.
        """
        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            
            # Try with the configured model
            logger.info(f"Validating credentials with model: {self.model_name}")
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content("Test")
            
            logger.info(f"✓ Credentials valid for model {self.model_name}")
            return True
        except Exception as e:
            logger.error(f"Gemini credential validation failed: {e}")
            # Log but don't fail - some errors might be temporary
            # The real test happens during actual usage
            return False


class OpenAIProvider(AIProvider):
    """OpenAI API provider."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(api_key=api_key)
        self.model_name = model_name
        self.api_key = api_key

    async def generate_content(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> str:
        """Generate content using OpenAI."""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise

    async def generate_content_with_image(
        self,
        prompt: str,
        image_data: bytes,
        mime_type: str = "image/jpeg",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate content with image input using OpenAI."""
        try:
            import base64

            image_base64 = base64.b64encode(image_data).decode("utf-8")
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_base64}"
                        },
                    },
                ],
            })

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI multimodal generation failed: {e}")
            raise

    def validate_credentials(self) -> bool:
        """Validate OpenAI API key."""
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key)
            client.models.list()
            return True
        except Exception as e:
            logger.error(f"OpenAI credential validation failed: {e}")
            return False


class ClaudeProvider(AIProvider):
    """Anthropic Claude provider."""

    def __init__(self, api_key: str, model_name: str = "claude-3-5-sonnet-20241022"):
        from anthropic import AsyncAnthropic

        self.client = AsyncAnthropic(api_key=api_key)
        self.model_name = model_name
        self.api_key = api_key

    async def generate_content(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> str:
        """Generate content using Claude."""
        try:
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "",
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude generation failed: {e}")
            raise

    async def generate_content_with_image(
        self,
        prompt: str,
        image_data: bytes,
        mime_type: str = "image/jpeg",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate content with image input using Claude."""
        try:
            import base64

            image_base64 = base64.b64encode(image_data).decode("utf-8")
            
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=4096,
                temperature=temperature,
                system=system_prompt or "",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": image_base64,
                                },
                            },
                        ],
                    }
                ],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude multimodal generation failed: {e}")
            raise

    def validate_credentials(self) -> bool:
        """Validate Claude API key."""
        try:
            from anthropic import Anthropic

            client = Anthropic(api_key=self.api_key)
            client.messages.create(
                model=self.model_name,
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}],
            )
            return True
        except Exception as e:
            logger.error(f"Claude credential validation failed: {e}")
            return False


class ProviderFactory:
    """Factory for creating AI provider instances."""

    _providers: Dict[ProviderType, type] = {
        ProviderType.GEMINI: GeminiProvider,
        ProviderType.OPENAI: OpenAIProvider,
        ProviderType.CLAUDE: ClaudeProvider,
    }

    @classmethod
    def create_provider(
        cls, provider_type: ProviderType, api_key: str, model_name: str
    ) -> AIProvider:
        """Create a provider instance."""
        provider_class = cls._providers.get(provider_type)
        if not provider_class:
            raise ValueError(f"Unsupported provider: {provider_type}")
        return provider_class(api_key=api_key, model_name=model_name)

    @classmethod
    def get_supported_providers(cls) -> List[str]:
        """Get list of supported providers."""
        return [p.value for p in ProviderType]
