import os
from typing import Optional, BinaryIO
import boto3
from botocore.config import Config


AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")


def get_s3_client():
    cfg = Config(signature_version="s3v4", s3={"addressing_style": "virtual"})
    return boto3.client("s3", region_name=AWS_REGION, endpoint_url=S3_ENDPOINT_URL, config=cfg)


def put_fileobj(key: str, fileobj: BinaryIO, content_type: Optional[str] = None):
    if not AWS_S3_BUCKET:
        raise RuntimeError("AWS_S3_BUCKET not set")
    extra = {"ContentType": content_type} if content_type else None
    client = get_s3_client()
    client.upload_fileobj(fileobj, AWS_S3_BUCKET, key, ExtraArgs=extra or {})


def presign_get_url(key: str, ttl_seconds: int = 86400) -> str:
    if not AWS_S3_BUCKET:
        raise RuntimeError("AWS_S3_BUCKET not set")
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object", Params={"Bucket": AWS_S3_BUCKET, "Key": key}, ExpiresIn=ttl_seconds
    )

