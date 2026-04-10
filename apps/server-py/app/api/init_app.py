from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.api.endpoints import api_router
from app.core.exc.base import BaseHTTPException
from app.db.postgres import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    logger.info("Starting up Yuka API...")
    yield
    logger.info("Shutting down Yuka API...")
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Yuka API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["set-auth-token"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.exception_handler(BaseHTTPException)
    async def http_exception_handler(request: Request, exc: BaseHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc._exception_alias, "message": exc.detail},
        )

    return app
