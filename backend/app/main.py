from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.db.session import engine
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.facts import router as facts_router
from app.api.sharing import router as sharing_router
from app.api.clinician import router as clinician_router
from app.api.summary import router as summary_router
from app.api.admin import router as admin_router
from app.services.gemini_service import gemini_service

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("meditale")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_TAGLINE,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers for clean and secure errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again or contact support."}
    )

# Register API Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(facts_router, prefix="/api")
app.include_router(sharing_router, prefix="/api")
app.include_router(clinician_router, prefix="/api")
app.include_router(summary_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

@app.get("/api/health")
def healthcheck():
    """Application and database health check."""
    db_connected = False
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
            db_connected = True
    except Exception as e:
        logger.error(f"Healthcheck DB connection error: {e}")

    return {
        "status": "online",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected" if db_connected else "disconnected",
        "gemini_ai": "active" if gemini_service.is_available() else "demonstration_mode",
        "model": settings.GEMINI_MODEL if gemini_service.is_available() else "synthetic-demo-engine"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
