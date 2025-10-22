import time
from typing import Callable
from fastapi import Request, HTTPException


class SimpleRateLimiter:
    def __init__(self, rate_per_minute: int = 120):
        self.rate = rate_per_minute
        self.allowance = {}

    def __call__(self, key: str) -> None:
        now = int(time.time() // 60)  # minute window
        count = self.allowance.get((key, now), 0)
        if count >= self.rate:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        self.allowance[(key, now)] = count + 1


limiter = SimpleRateLimiter()


async def rate_limit_middleware(request: Request, call_next: Callable):
    key = request.client.host if request.client else "unknown"
    try:
        limiter(key)
    except HTTPException as e:
        raise e
    return await call_next(request)

