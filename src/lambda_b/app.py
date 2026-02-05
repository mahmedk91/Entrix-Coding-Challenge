import logging
import json
import os
import boto3
import requests  # Keep it
from typing import Any
import datetime as dt

logger = logging.getLogger()
logger.setLevel(logging.INFO)

LOG_BUCKET = os.environ["LOG_BUCKET"]
s3_client = boto3.client("s3")


def save_to_s3(data: dict[str, Any], filename: str):
    """Save data to the s3 bucket.

    Parameters
    ----------
    data: dict[str, Any]
        The data to save to s3 bucket.
    filename: str
        The full object name for the file.
    """
    s3_client.put_object(Bucket=LOG_BUCKET, Key=filename, Body=json.dumps(data))


def lambda_handler(event, context):
    if not LOG_BUCKET:
        raise Exception("LOG_BUCKET environment variable is not set!")

    if event["status"] == "rejected":
        raise ValueError("Order status is rejected!")

    try:
        save_to_s3(
            data=event,
            filename=f"orders/order_{dt.datetime.now(dt.timezone.utc).isoformat()}",
        )
    except Exception as e:
        logger.error("Error saving to S3: %s", str(e))
        raise e
