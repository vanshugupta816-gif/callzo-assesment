
from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import engine

from app.routes.webhook_routes import router as webhook_router


app = FastAPI(
    title=settings.APP_NAME,
    description="Callzo Webhook Backend API",
    version="1.0.0",
    debug=settings.DEBUG
)


@app.get("/")
def home():

    return {
        "message": "Welcome to Callzo Webhook Backend",
        "status": "Running"
    }


app.include_router(webhook_router)


@app.get("/health")
def health_check():

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected"
            }
        )
