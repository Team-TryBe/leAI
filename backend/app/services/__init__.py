"""Services package for Aditus."""
from app.services.ai_orchestrator import AIOrchestrator, extract_job_data, draft_cv, draft_cover_letter
from app.services.universal_provider import ProviderFactory, AIProvider, TaskType, ProviderType
from app.services.model_router import ModelRouter, TASK_EXTRACTION, TASK_CV_DRAFT, TASK_COVER_LETTER

__all__ = [
    "AIOrchestrator",
    "extract_job_data",
    "draft_cv",
    "draft_cover_letter",
    "ProviderFactory",
    "AIProvider",
    "TaskType",
    "ProviderType",
    "ModelRouter",
    "TASK_EXTRACTION",
    "TASK_CV_DRAFT",
    "TASK_COVER_LETTER",
]