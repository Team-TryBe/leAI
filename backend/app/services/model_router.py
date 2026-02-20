"""
Plan-aware model routing for AI tasks.
Centralizes model selection by task + subscription plan.
"""

from typing import Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.models import PlanType, Subscription, SubscriptionStatus


TASK_EXTRACTION = "extraction"
TASK_CV_DRAFT = "cv_draft"
TASK_COVER_LETTER = "cover_letter"


class ModelRouter:
    """Resolve model name by plan and task."""

    def __init__(self, policy: Dict[PlanType, Dict[str, str]] | None = None):
        settings = get_settings()
        self.fast_model = settings.GEMINI_MODEL_FAST
        self.quality_model = settings.GEMINI_MODEL_QUALITY

        self.policy: Dict[PlanType, Dict[str, str]] = policy or {
            PlanType.FREEMIUM: {
                TASK_EXTRACTION: self.fast_model,
                TASK_CV_DRAFT: self.fast_model,
                TASK_COVER_LETTER: self.fast_model,
            },
            PlanType.PAY_AS_YOU_GO: {
                TASK_EXTRACTION: self.fast_model,
                TASK_CV_DRAFT: self.fast_model,
                TASK_COVER_LETTER: self.fast_model,
            },
            PlanType.PRO_MONTHLY: {
                TASK_EXTRACTION: self.fast_model,
                TASK_CV_DRAFT: self.quality_model,
                TASK_COVER_LETTER: self.quality_model,
            },
            PlanType.PRO_ANNUAL: {
                TASK_EXTRACTION: self.fast_model,
                TASK_CV_DRAFT: self.quality_model,
                TASK_COVER_LETTER: self.quality_model,
            },
        }

    def get_model_for_plan(self, plan_type: PlanType, task: str) -> str:
        plan_policy = self.policy.get(plan_type) or self.policy.get(PlanType.FREEMIUM, {})
        return plan_policy.get(task, self.fast_model)

    async def get_user_plan_type(self, db: AsyncSession, user_id: int) -> PlanType:
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .options(selectinload(Subscription.plan))
        )
        result = await db.execute(stmt)
        subscription = result.scalar_one_or_none()

        if not subscription or not subscription.plan:
            return PlanType.FREEMIUM

        if subscription.status != SubscriptionStatus.ACTIVE:
            return PlanType.FREEMIUM

        plan_type = subscription.plan.plan_type
        if isinstance(plan_type, PlanType):
            return plan_type

        try:
            return PlanType(plan_type)
        except Exception:
            return PlanType.FREEMIUM

    async def get_model_for_user(self, db: AsyncSession, user_id: int, task: str) -> str:
        plan_type = await self.get_user_plan_type(db, user_id)
        return self.get_model_for_plan(plan_type, task)
