# GadgetHub WebApps

GadgetHub is an e-commerce demo project built with a React frontend and Node/Express backend, using MongoDB Atlas for data storage and AWS S3 for image hosting. It features a storefront with product browsing, search, filtering, and flash sales, as well as an admin interface for managing products and flash sales.

## Features

- Public product browsing with search, category filters, price filters, sorting, and pagination
- Product details with flash-sale pricing when a sale is active
- Customer registration, login, cart management, checkout, and order history
- Product manager catalog management, image uploads, and flash-sale scheduling
- Admin product-manager account management
- Automated tests with Vitest, React Testing Library, Supertest, Playwright, and `mongodb-memory-server`

## Environment Setup

Create a `.env` file in the project root with the values you need:

```env
# Main app database connection used by the Node/Express server
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/gadgethub?retryWrites=true&w=majority&appName=GadgetHub

# Express server
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret

# Frontend origins and API base URL
APP_ORIGIN=http://localhost:5173
AMPLIFY_APP_ORIGIN=https://your-amplify-domain.amplifyapp.com
VITE_API_BASE_URL=/api

# S3 image upload settings used by both the app and the Python seed scripts
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_PUBLIC_BASE_URL=

# Optional bootstrap accounts created by the seed scripts
SEED_SUPER_ADMIN_EMAIL=
SEED_SUPER_ADMIN_PASSWORD=
SEED_SUPER_ADMIN_NAME=GadgetHub Admin
SEED_MANAGER_EMAIL=
SEED_MANAGER_PASSWORD=
SEED_MANAGER_NAME=GadgetHub Manager

# Optional load-test seed data
SEED_LOAD_TEST_PRODUCT=false
LOAD_TEST_PRODUCT_SKU=GH-LOAD-FLASH-SALE

# Optional Playwright and load-test configuration
E2E_USE_LOCAL_SERVER=true
E2E_BASE_URL=http://127.0.0.1:4173
LOAD_TEST_BASE_URL=http://localhost:5000
LOAD_TEST_USER_PREFIX=load-test-user
LOAD_TEST_USER_PASSWORD=ChangeMe123!
LOAD_TEST_VUS=10
LOAD_TEST_DURATION=15s
LOAD_TEST_PAUSE_MS=1000
LOAD_TEST_REQUEST_TIMEOUT_MS=5000
```

### Required environment variables to run:

- `MONGODB_URI`
- `JWT_SECRET`
- `APP_ORIGIN` (for local development)

### Required for seeding DB

- `AWS_REGION`
- `S3_BUCKET_NAME`
- working AWS credentials through env vars
- `MONGODB_URI`

Python seed scripts upload the tracked files in `public/seed-images` to S3 first, then store the resulting image URLs in MongoDB.

## MongoDB Notes

- Atlas is the intended database setup for this project.
- Both the app and the Atlas seed script read `MONGODB_URI`.

## Install And Run

Install the Node dependencies:

```bash
npm install
```

Create and activate a local virtual environment for the Python seed scripts:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

If you open a new terminal later, reactivate it with:

```bash
source .venv/bin/activate
```

Start the backend:

```bash
npm run server
```

Start the frontend in a second terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Python Seed Commands

Seed MongoDB Atlas:

```bash
python3 server/seed_atlas.py
```

What the seed scripts do:

- generate the 50-product demo catalog
- upload each seed image to S3
- upsert products into MongoDB with the uploaded image URL
- optionally create the bootstrap admin accounts from `SEED_*`
- optionally create the dedicated flash-sale load-test product when `SEED_LOAD_TEST_PRODUCT=true`

## Main Scripts

```bash
npm run dev
npm run server
```

## Testing

```bash
npm test
npm run build
npm run test:e2e
npm run load:flash-sale
npm run lint
```

`npm run test:e2e` starts the Vite storefront automatically on `http://127.0.0.1:4173` unless `E2E_USE_LOCAL_SERVER=false`, in which case Playwright targets `E2E_BASE_URL` directly.

## Deployment Notes

- Frontend hosting is configured for AWS Amplify through `amplify.yml`.
- Backend hosting is configured for AWS App Runner through `apprunner.yaml`.
- S3 remains the image host for manager uploads and seeded product media.
- Atlas remains the recommended production database target because the checkout flow uses MongoDB transactions.
