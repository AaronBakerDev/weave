"""
Weave FastAPI Configuration

Centralizes environment variables and application settings
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"

    # Database
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://user:password@localhost:5432/weave",
    )
    database_pool_size: int = 20
    database_max_overflow: int = 0

    # OpenAI API
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_embedding_model: str = "text-embedding-3-large"
    openai_embedding_dimension: int = 3072

    # S3 Configuration
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    s3_bucket: str = os.getenv("S3_BUCKET", "weave-memories")
    s3_region: str = os.getenv("S3_REGION", "us-west-000")  # Backblaze B2
    s3_endpoint_url: str = os.getenv(
        "S3_ENDPOINT_URL", "https://s3.us-west-000.backblazeb2.com"
    )

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: list = ["http://localhost:3000", "https://*.vercel.app"]

    # Authentication
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-prod")
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # Moderation
    enable_moderation: bool = True
    moderation_threshold: float = 0.5

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
