from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
import os
from fastapi.middleware.cors import CORSMiddleware
import time
import logging
from .middleware.rate_limit import rate_limit_middleware
from .routers import memories as memories_router
from .routers import search as search_router
from .routers import weave as weave_router
from .routers import invites as invites_router
from .routers import artifacts as artifacts_router
from .routers import public as public_router
from .routers import follows as follows_router
from .routers import graph as graph_router
from .routers import export as export_router

app = FastAPI(
    title="Weave API",
    version="1.0",
    default_response_class=ORJSONResponse,
)

# CORS
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(rate_limit_middleware)


logger = logging.getLogger("weave.api")
logging.basicConfig(level=logging.INFO)


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    resp = await call_next(request)
    dur_ms = int((time.time() - start) * 1000)
    logger.info(
        "method=%s path=%s status=%s dur_ms=%s",
        request.method,
        request.url.path,
        resp.status_code,
        dur_ms,
    )
    return resp


@app.get("/v1/health")
async def health():
    return {"ok": True, "version": app.version}


app.include_router(memories_router.router)
app.include_router(search_router.router)
app.include_router(weave_router.router)
app.include_router(invites_router.router)
app.include_router(artifacts_router.router)
app.include_router(public_router.router)
app.include_router(follows_router.router)
app.include_router(graph_router.router)
app.include_router(export_router.router)
