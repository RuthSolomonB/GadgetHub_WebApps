from __future__ import annotations

import mimetypes
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

import bcrypt
import boto3
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import ConfigurationError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SEED_IMAGE_DIR = PROJECT_ROOT / "public" / "seed-images"
DEFAULT_LOAD_TEST_PRODUCT_SKU = "GH-LOAD-FLASH-SALE"

CATALOG_BLUEPRINT = [
    {"category": "Phones", "base_price": 499, "prefix": "Nova Phone", "hero": "all-day battery"},
    {"category": "Computers", "base_price": 899, "prefix": "Atlas Laptop", "hero": "high-refresh display"},
    {"category": "Audio", "base_price": 149, "prefix": "Pulse Audio", "hero": "immersive sound"},
    {"category": "Wearables", "base_price": 229, "prefix": "Orbit Watch", "hero": "wellness tracking"},
    {"category": "Gaming", "base_price": 349, "prefix": "Vector Console", "hero": "low-latency controls"},
]

VARIANTS = [
    "Core",
    "Plus",
    "Air",
    "Max",
    "Pro",
    "Studio",
    "Lite",
    "Ultra",
    "Edge",
    "Prime",
]


def load_project_env() -> None:
    load_dotenv(PROJECT_ROOT / ".env")


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required.")
    if "<" in value and ">" in value:
        raise RuntimeError(f"{name} still contains placeholder values.")
    return value


def is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() == "true"


def round_currency(value: float) -> float:
    return round(value + 1e-9, 2)


def build_seed_image_filename(index: int) -> str:
    return f"product_{index:02d}.png"


def build_s3_object_url(key: str) -> str:
    public_base = os.getenv("S3_PUBLIC_BASE_URL", "").rstrip("/")
    if public_base:
        return f"{public_base}/{quote(key, safe='/')}"

    bucket = require_env("S3_BUCKET_NAME")
    region = require_env("AWS_REGION")
    return f"https://{bucket}.s3.{region}.amazonaws.com/{quote(key, safe='/')}"


def build_s3_client():
    region = require_env("AWS_REGION")
    return boto3.client("s3", region_name=region)


def upload_seed_image(s3_client, image_path: Path, object_key: str) -> str:
    bucket = require_env("S3_BUCKET_NAME")
    content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    s3_client.upload_file(
        str(image_path),
        bucket,
        object_key,
        ExtraArgs={
            "ACL": "public-read",
            "CacheControl": "public, max-age=31536000, immutable",
            "ContentType": content_type,
        },
    )
    return build_s3_object_url(object_key)


def build_catalog_products() -> list[dict]:
    now = datetime.now(timezone.utc)
    starts_at = now - timedelta(hours=1)
    ends_at = now + timedelta(days=7)
    products: list[dict] = []

    for category_index, blueprint in enumerate(CATALOG_BLUEPRINT):
        for variant_index, variant in enumerate(VARIANTS):
            stock_qty = 12 + category_index * 3 + variant_index
            seed_id = f"{category_index + 1}{variant_index + 1}"
            has_flash_sale = variant_index % 3 == 0
            name = f"{blueprint['prefix']} {variant}"

            products.append(
                {
                    "name": name,
                    "description": (
                        f"{name} offers {blueprint['hero']} and a straightforward everyday setup for GadgetHub shoppers."
                    ),
                    "price": blueprint["base_price"] + variant_index * 35 + category_index * 20,
                    "image": "/vite.svg",
                    "category": blueprint["category"],
                    "sku": f"GH-{seed_id}-{variant.upper()}",
                    "stockQty": stock_qty,
                    "isActive": True,
                    "flashSale": {
                        "enabled": has_flash_sale,
                        "salePrice": blueprint["base_price"] + variant_index * 25 if has_flash_sale else None,
                        "discountPercent": None,
                        "startsAt": starts_at if has_flash_sale else None,
                        "endsAt": ends_at if has_flash_sale else None,
                        "saleStockQty": max(3, stock_qty // 3) if has_flash_sale else 0,
                    },
                }
            )

    return products


def build_load_test_product(sku: str = DEFAULT_LOAD_TEST_PRODUCT_SKU, stock_qty: int = 5000) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "name": "GadgetHub Flash Sale Load Test Device",
        "description": "Dedicated staging-only product for flash-sale checkout load testing.",
        "category": "Load Testing",
        "sku": sku.strip().upper(),
        "price": 199,
        "stockQty": stock_qty,
        "image": "/vite.svg",
        "isActive": True,
        "flashSale": {
            "enabled": True,
            "salePrice": 149,
            "discountPercent": None,
            "startsAt": now - timedelta(hours=1),
            "endsAt": now + timedelta(days=365),
            "saleStockQty": stock_qty,
        },
    }


def attach_uploaded_images(products: list[dict]) -> list[dict]:
    s3_client = build_s3_client()
    seeded_products: list[dict] = []

    for index, product in enumerate(products, start=1):
        image_path = SEED_IMAGE_DIR / build_seed_image_filename(index)
        if not image_path.exists():
            if product["category"] == "Load Testing":
                image_path = PROJECT_ROOT / "public" / "vite.svg"
            else:
                raise RuntimeError(f"Missing seed image: {image_path}")

        object_key = f"products/seeds/{product['sku'].lower()}{image_path.suffix.lower()}"
        image_url = upload_seed_image(s3_client, image_path, object_key)
        seeded_products.append({**product, "image": image_url})

    return seeded_products


def build_bootstrap_users() -> list[dict]:
    configured_users = [
        {
            "email": os.getenv("SEED_SUPER_ADMIN_EMAIL", "").strip().lower(),
            "password": os.getenv("SEED_SUPER_ADMIN_PASSWORD", "").strip(),
            "displayName": os.getenv("SEED_SUPER_ADMIN_NAME", "GadgetHub Admin").strip(),
            "role": "super_admin",
        },
        {
            "email": os.getenv("SEED_MANAGER_EMAIL", "").strip().lower(),
            "password": os.getenv("SEED_MANAGER_PASSWORD", "").strip(),
            "displayName": os.getenv("SEED_MANAGER_NAME", "GadgetHub Manager").strip(),
            "role": "product_manager",
        },
    ]

    return [user for user in configured_users if user["email"] and user["password"]]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def connect_to_database(uri: str):
    if not uri:
        raise RuntimeError("A MongoDB URI is required.")
    if "<" in uri and ">" in uri:
        raise RuntimeError("The MongoDB URI still contains placeholder values.")

    client = MongoClient(uri)
    client.admin.command("ping")
    return client


def resolve_database(client: MongoClient):
    try:
        return client.get_default_database()
    except ConfigurationError:
        return client["gadgethub"]


def upsert_products(database, products: list[dict]) -> int:
    timestamp = datetime.now(timezone.utc)
    operations = []

    for product in products:
        operations.append(
            UpdateOne(
                {"name": product["name"], "category": product["category"]},
                {
                    "$set": {
                        "name": product["name"],
                        "description": product["description"],
                        "price": round_currency(product["price"]),
                        "stockQty": int(product["stockQty"]),
                        "image": product["image"],
                        "category": product["category"],
                        "sku": product["sku"].upper(),
                        "isActive": bool(product["isActive"]),
                        "flashSale": product["flashSale"],
                        "updatedAt": timestamp,
                    },
                    "$setOnInsert": {"createdAt": timestamp},
                },
                upsert=True,
            )
        )

    if not operations:
        return 0

    database["products"].bulk_write(operations, ordered=False)
    return len(products)


def upsert_users(database, users: list[dict]) -> int:
    timestamp = datetime.now(timezone.utc)
    operations = []

    for user in users:
        operations.append(
            UpdateOne(
                {"email": user["email"]},
                {
                    "$set": {
                        "email": user["email"],
                        "displayName": user["displayName"],
                        "passwordHash": hash_password(user["password"]),
                        "role": user["role"],
                        "isActive": True,
                        "updatedAt": timestamp,
                    },
                    "$setOnInsert": {"createdAt": timestamp},
                },
                upsert=True,
            )
        )

    if not operations:
        return 0

    database["users"].bulk_write(operations, ordered=False)
    return len(users)


def build_seed_products() -> list[dict]:
    products = build_catalog_products()

    if is_truthy(os.getenv("SEED_LOAD_TEST_PRODUCT")):
        load_test_sku = os.getenv("LOAD_TEST_PRODUCT_SKU", DEFAULT_LOAD_TEST_PRODUCT_SKU).strip().upper()
        products.append(build_load_test_product(load_test_sku))

    return attach_uploaded_images(products)


def run_seed(uri: str, target_name: str) -> None:
    load_project_env()
    client = connect_to_database(uri)

    try:
        database = resolve_database(client)
        products = build_seed_products()
        users = build_bootstrap_users()
        product_count = upsert_products(database, products)
        user_count = upsert_users(database, users)

        print(f"Seed target: {target_name}")
        print(f"Database: {database.name}")
        print(f"Seeded or refreshed {product_count} products.")
        print(f"Seeded or refreshed {user_count} bootstrap users.")
    finally:
        client.close()
