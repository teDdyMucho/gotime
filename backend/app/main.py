from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import facilities, requestors, clients, pay_sources, trips, metrics, audit, notifications

settings = get_settings()

app = FastAPI(
    title="Go Time Transportation — Pre-CQ API",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(facilities.router, prefix="/api")
app.include_router(requestors.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(pay_sources.router, prefix="/api")
app.include_router(trips.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "env": settings.environment}
