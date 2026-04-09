# GadgetHub WebApps

GadgetHub is a split-deployment MERN storefront:

- React frontend hosted on AWS Amplify
- Express API hosted on AWS App Runner
- MongoDB Atlas for products, users, carts, and orders
- Amazon S3 for manager/admin product image uploads

## Implemented application surface

- Public product browsing with search, category filter, price filter, sorting, and pagination
- Product details with effective flash-sale pricing
- Customer registration, login, session restoration, cart, checkout, and order history
- Product manager product creation, editing, deactivation, flash-sale configuration, and image upload support
- Super-admin product-manager account management
- MongoDB-backed cart, order, and product data model
- Automated tests with Vitest, Supertest, React Testing Library, and mongodb-memory-server

## Local development

1. Create `.env` from `.env.example`.
2. Add a valid Atlas connection string to `MONGODB_URI`.
3. Add a `JWT_SECRET`.
4. Provide `AWS_REGION` and `S3_BUCKET_NAME` so seeded product images and manager uploads can be stored in S3. For local development, also provide either local AWS keys or an AWS profile.
5. Install dependencies:

```bash
npm install
```

6. Seed the database with products and bootstrap admin users:

```bash
npm run seed
```

7. Start the backend:

```bash
npm run server
```

8. Start the frontend in a second terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Key scripts

```bash
npm run dev
npm run server
npm run seed
npm run lint
npm run build
npm test
npm run test:e2e
npm run load:flash-sale
```

`npm run test:e2e` starts the Vite storefront automatically on `http://127.0.0.1:4173` unless `E2E_USE_LOCAL_SERVER=false`, in which case Playwright targets `E2E_BASE_URL` directly.

`npm run load:flash-sale` prefers the `k6` CLI when it is installed. If `k6` is not on `PATH`, the repo falls back to a built-in Node runner. Both runners bootstrap staging customers, reset carts, add the dedicated load-test SKU, and then attempt checkout.

## Environment variables

```env
MONGODB_URI=mongodb+srv://...
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
APP_ORIGIN=http://localhost:5173
AMPLIFY_APP_ORIGIN=https://your-app.amplifyapp.com
VITE_API_BASE_URL=/api
E2E_USE_LOCAL_SERVER=true
E2E_BASE_URL=http://127.0.0.1:4173
SEED_LOAD_TEST_PRODUCT=false
LOAD_TEST_BASE_URL=http://localhost:5000
LOAD_TEST_USER_PREFIX=load-test-user
LOAD_TEST_USER_PASSWORD=ChangeMe123!
LOAD_TEST_PRODUCT_SKU=GH-LOAD-FLASH-SALE
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_PUBLIC_BASE_URL=
SEED_SUPER_ADMIN_EMAIL=admin@gadgethub.local
SEED_SUPER_ADMIN_PASSWORD=ChangeMe123!
SEED_SUPER_ADMIN_NAME=GadgetHub Admin
SEED_MANAGER_EMAIL=manager@gadgethub.local
SEED_MANAGER_PASSWORD=ChangeMe123!
SEED_MANAGER_NAME=GadgetHub Manager
```

In App Runner, prefer IAM roles and runtime secrets over static AWS keys. Set `S3_PUBLIC_BASE_URL` only when product images should be served through CloudFront or another public asset domain instead of direct S3 object URLs.

Optional load-test tuning variables:

```env
LOAD_TEST_VUS=10
LOAD_TEST_DURATION=15s
LOAD_TEST_PAUSE_MS=1000
LOAD_TEST_REQUEST_TIMEOUT_MS=5000
```

## Backend API summary

### Public

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Authenticated customer

- `GET /api/auth/me`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`
- `POST /api/checkout`
- `GET /api/orders`
- `GET /api/orders/:id`

### Product manager / super admin

- `POST /api/products`
- `PATCH /api/products/:id`
- `POST /api/upload`

### Super admin

- `GET /api/admin/product-managers`
- `POST /api/admin/product-managers`
- `PATCH /api/admin/product-managers/:id`

## MongoDB model summary

### Product

- `name`
- `description`
- `category`
- `price`
- `image`
- `stockQty`
- `sku`
- `isActive`
- `flashSale.enabled`
- `flashSale.salePrice`
- `flashSale.startsAt`
- `flashSale.endsAt`
- `flashSale.saleStockQty`

### User

- `email`
- `passwordHash`
- `displayName`
- `role`
- `isActive`

### Cart

- `userId`
- `items[{ productId, quantity }]`

### Order

- `userId`
- `status`
- `items[{ productId, nameSnapshot, imageSnapshot, unitPriceSnapshot, quantity, lineTotal, usedFlashSale }]`
- `subtotal`
- `total`
- `placedAt`

## AWS deployment shape

### Amplify frontend

- `amplify.yml` pins Node `22.12.0`, installs dependencies, builds the SPA, and publishes `dist`
- Add the SPA rewrite rule for client-side routing
- Set `VITE_API_BASE_URL=https://<app-runner-domain>/api`

### App Runner backend

- Use the root `apprunner.yaml`
- Source directory should be the repository root
- Inject `MONGODB_URI`, `JWT_SECRET`, `APP_ORIGIN`, `AMPLIFY_APP_ORIGIN`, `AWS_REGION`, and `S3_BUCKET_NAME`
- Prefer an IAM role for S3 access
- Use `/api/health` for smoke checks

### Atlas and S3

- Atlas should allow the App Runner service to connect and should contain the seeded GadgetHub database
- S3 should expose uploaded product images publicly or through CloudFront

## Manual live staging testing

Manual live testing should be run from a developer machine against staging URLs. Do not use production for Playwright or flash-sale load tests.

### Live storefront smoke test

Run Playwright directly against the deployed staging frontend:

```bash
E2E_USE_LOCAL_SERVER=false \
E2E_BASE_URL=https://<staging-amplify-domain> \
npm run test:e2e
```

### Live API smoke test

Check the deployed backend health endpoint before running heavier tests:

```bash
curl https://<staging-app-runner-domain>/api/health
```

### Live flash-sale load test

Seed the dedicated product into staging once:

```bash
SEED_LOAD_TEST_PRODUCT=true LOAD_TEST_PRODUCT_SKU=GH-LOAD-FLASH-SALE npm run seed
```

Then run the load test from your machine against the staging backend:

```bash
LOAD_TEST_BASE_URL=https://<staging-app-runner-domain> \
LOAD_TEST_USER_PASSWORD='<staging-password>' \
LOAD_TEST_PRODUCT_SKU=GH-LOAD-FLASH-SALE \
npm run load:flash-sale
```

### Staging data policy

- Keep Playwright deployed-mode and flash-sale load testing on staging only
- Seed the dedicated staging product with `SEED_LOAD_TEST_PRODUCT=true npm run seed`
- The default staged load-test SKU is `GH-LOAD-FLASH-SALE`
- Staging user, cart, and order data generated by load tests is disposable

## Local validation

- Use Node `22.12.0` or newer within the repo’s supported range
- Run `npm run lint`
- Run `npm test`
- Run `npm run build`
- Run `npm run test:e2e` for local storefront checks
- Run the manual live staging commands above when you want to test deployed services
