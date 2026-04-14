from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import facilities, requestors, clients, pay_sources, trips, metrics, audit, notifications
from app.routers.notifications import log_router as notifications_log_router

settings = get_settings()

app = FastAPI(
    title="Go Time Transportation — Pre-CQ API",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment != "production" else settings.origins_list,
    allow_credentials=False if settings.environment != "production" else True,
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
app.include_router(notifications_log_router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "env": settings.environment}


@app.get("/debug/token")
def debug_token(request: Request):
    """Temp debug — shows what token the backend receives."""
    auth = request.headers.get("Authorization", "MISSING")
    token = auth.replace("Bearer ", "") if auth != "MISSING" else "MISSING"
    # Decode without verification to see the payload
    try:
        import base64, json
        parts = token.split(".")
        if len(parts) == 3:
            padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
            payload = json.loads(base64.urlsafe_b64decode(padded))
            return {"token_preview": token[:40] + "...", "payload": payload}
    except Exception as e:
        pass
    return {"auth_header": auth[:80] if auth != "MISSING" else "MISSING"}
