import logging
import json
import os
from typing import Any
from decimal import Decimal
import boto3
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def save_to_db(records: list[dict[str, Any]]):
    """Save records to the table.

    Parameters
    ----------
    records: list[dict[str, Any]]
        The data to save to Table.
    """

    # TTL: current time + 24 hours (in seconds)
    ttl_timestamp = int(time.time()) + 86400

    with table.batch_writer() as batch:
        for record in records:
            record["ttl"] = ttl_timestamp
            batch.put_item(Item=record)

    logger.info("Records are successfully saved to the DB table %s.", TABLE_NAME)


def lambda_handler(event, context):
    """Process POST request to the API."""
    logger.info(
        "Received %s request to %s endpoint", event["httpMethod"], event["path"]
    )

    if not TABLE_NAME:
        logger.error(
            "TABLE_NAME environment variable is not set. Cannot save records to the database."
        )
        return {
            "isBase64Encoded": False,
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"errorMessage": "Internal server error"}),
        }

    if (body := event["body"]) is not None:
        try:
            orders = json.loads(event['body'], parse_float=Decimal)
            logger.info("Orders received: %s.", orders)
            save_to_db(records=orders)
        except Exception as e:
            logger.error("Error saving records to the database: %s", str(e))
            return {
                "isBase64Encoded": False,
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"errorMessage": "Internal server error"}),
            }

        return {
            "isBase64Encoded": False,
            "statusCode": 201,
            "headers": {"Content-Type": "application/json"},
            "body": "",
        }

    return {
        "isBase64Encoded": False,
        "statusCode": 400,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"errorMessage": "Request body is empty"}),
    }
