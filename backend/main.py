"""
Aditus: Career Workflow Agent for Kenyan Job Market
Main FastAPI application entry point with async/await support.

This application automates the process from job URL submission to
drafting complete application materials (CV, Cover Letter, Cold Outreach).
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, validate_settings
from app.db.database import get_db, init_db, close_db
from app.db.models import Base
from app.api import auth, users, admin, master_profile, job_extractor, cv_personalizer, cv_drafter, cover_letter, applications, subscriptions, payments, paystack_payments, super_admin, referral, provider_admin


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# LIFESPAN EVENT HANDLERS
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for app startup and shutdown events.
    """
    # STARTUP
    logger.info("🚀 Aditus application starting up...")
    settings = get_settings()
    
    try:
        validate_settings(settings)
        await init_db()
        logger.info("✅ Database initialized successfully")
        
        # Initialize cache cleanup background task
        from app.services.cache_manager import CacheManager
        from app.db.database import AsyncSessionLocal
        
        async def cleanup_expired_caches():
            """Background task to clean up expired caches hourly."""
            async with AsyncSessionLocal() as db:
                cache_mgr = CacheManager(db=db)
                await cache_mgr.cleanup_expired_caches()
                logger.info("✅ Expired caches cleaned up")
        
        # Schedule cleanup to run every hour
        import asyncio
        cleanup_task = asyncio.create_task(_run_cleanup_periodically(cleanup_expired_caches))
        app.cleanup_task = cleanup_task
        logger.info("✅ Cache cleanup background task started")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        raise
    
    logger.info(f"📊 Running on {settings.SERVER_HOST}:{settings.SERVER_PORT}")
    logger.info(f"🧠 Gemini Model: {settings.GEMINI_MODEL}")
    
    yield  # Application runs here
    
    # SHUTDOWN
    logger.info("🛑 Aditus application shutting down...")
    try:
        if hasattr(app, 'cleanup_task'):
            app.cleanup_task.cancel()
            try:
                await app.cleanup_task
            except:
                pass
        await close_db()
        logger.info("✅ Database connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")


async def _run_cleanup_periodically(cleanup_func):
    """Run cleanup function every hour."""
    import asyncio
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            await cleanup_func()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in cleanup task: {str(e)}")


# ============================================================================
# APP INITIALIZATION
# ============================================================================

def create_app() -> FastAPI:
    """
    Factory function to create and configure the FastAPI application.
    """
    settings = get_settings()
    
    app = FastAPI(
        title=settings.APP_NAME,
        description="Automate job applications with AI-powered CV, Cover Letter, and Outreach generation",
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )
    
    # ========================================================================
    # MIDDLEWARE CONFIGURATION
    # ========================================================================
    
    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
    
    # ========================================================================
    # HEALTH CHECK ENDPOINTS
    # ========================================================================
    
    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }
    
    @app.get("/health/db", tags=["Health"])
    async def health_check_db(db: AsyncSession = Depends(get_db)):
        """Database health check endpoint."""
        try:
            await db.execute("SELECT 1")
            return {"status": "healthy", "database": "connected"}
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="Database connection failed"
            )
    
    # ========================================================================
    # ROOT ENDPOINT
    # ========================================================================
    
    @app.get("/", tags=["Info"])
    async def root():
        """Root endpoint with API information."""
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "openapi": "/openapi.json",
            }
        }
    
    # ========================================================================
    # API ROUTES (Phase 2 Implementation)
    # ========================================================================
    
    # Include routers
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    app.include_router(master_profile.router, prefix="/api/v1")
    app.include_router(job_extractor.router, prefix="/api/v1")
    app.include_router(cv_personalizer.router, prefix="/api/v1")
    app.include_router(cv_drafter.router, prefix="/api/v1")
    app.include_router(cover_letter.router, prefix="/api/v1")
    app.include_router(applications.router, prefix="/api/v1")
    app.include_router(subscriptions.router, prefix="/api/v1")
    app.include_router(payments.router, prefix="/api/v1")
    app.include_router(paystack_payments.router, prefix="/api/v1")
    app.include_router(super_admin.router, prefix="/api/v1")
    app.include_router(referral.router, prefix="/api/v1")  # Referral system endpoints
    app.include_router(provider_admin.router, prefix="/api/v1")  # AI Provider management
    
    # Master Profile Routes (TODO)
    # - GET /api/v1/master-profile
    # - PUT /api/v1/master-profile
    # - POST /api/v1/master-profile/upload-cv
    
    # Job Application Routes (TODO)
    # - POST /api/v1/applications/submit-job-url
    # - GET /api/v1/applications/{id}
    # - GET /api/v1/applications (list all)
    # - PATCH /api/v1/applications/{id}/status
    
    # AI Generation Routes (TODO)
    # - GET /api/v1/applications/{id}/extracted-data
    # - POST /api/v1/applications/{id}/generate-cv
    # - POST /api/v1/applications/{id}/generate-cover-letter
    # - POST /api/v1/applications/{id}/generate-outreach
    
    # Review Routes (TODO)
    # - POST /api/v1/applications/{id}/review
    # - GET /api/v1/applications/{id}/review
    
    # PDF Export Routes (TODO)
    # - GET /api/v1/applications/{id}/export-cv
    # - GET /api/v1/applications/{id}/export-cover-letter
    
    logger.info("✅ FastAPI application configured successfully")
    return app


# ============================================================================
# APP INSTANCE
# ============================================================================

app = create_app()


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
