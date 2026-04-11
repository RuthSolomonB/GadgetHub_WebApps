import os

from seed_common import load_project_env, run_seed


def main() -> None:
    load_project_env()
    mongo_uri = os.getenv("MONGODB_URI", "").strip()

    if not mongo_uri:
        raise SystemExit("MONGODB_URI is required.")

    if not mongo_uri.startswith("mongodb+srv://"):
        raise SystemExit("seed_atlas.py expects an Atlas mongodb+srv:// URI.")

    run_seed(mongo_uri, "MongoDB Atlas")


if __name__ == "__main__":
    main()
