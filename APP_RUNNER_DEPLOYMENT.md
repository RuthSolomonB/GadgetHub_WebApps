# Deploying GadgetHub API to AWS App Runner

This repository now treats App Runner as the **backend API host**, not the single host for both frontend and backend.

The target production shape is:

- Amplify serves the React frontend
- App Runner serves the Express API
- MongoDB Atlas stores application data
- S3 stores uploaded product images

## Files involved

- `apprunner.yaml`: App Runner source-code configuration at the repo root
- `server/index.js`: backend entrypoint
- `server/app.js`: Express app factory
- `amplify.yml`: Amplify frontend build configuration

## 1. Prepare Atlas first

1. Create or verify the Atlas cluster.
2. Create an application database user.
3. Add Atlas network access that allows the App Runner service to connect.
4. Copy the final `mongodb+srv://...` connection string.
5. Seed the data from your local machine:

```bash
npm run seed
```

If you want bootstrap admin accounts created by the seed step, provide the `SEED_*` environment variables locally before running it.

## 2. Prepare S3 for product uploads

1. Create an S3 bucket dedicated to product images.
2. Keep object keys under `products/`.
3. Configure read access so uploaded images can be displayed by the frontend.
4. In production, prefer an App Runner IAM role over static AWS access keys.

Required runtime values:

- `AWS_REGION`
- `S3_BUCKET_NAME`

Optional only for local development:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 3. Create the App Runner service

1. In AWS, open App Runner and create a new service from a source code repository.
2. Connect the GitHub repository.
3. Use the repository root as the source directory.
4. Tell App Runner to use the repository configuration file.

The root `apprunner.yaml` already defines:

- `npm ci` during build
- `npm prune --omit=dev` to trim runtime dependencies
- `npm run start` at runtime
- service port `8080`

## 4. Add runtime environment variables and secrets

At minimum, set:

- `MONGODB_URI`
- `JWT_SECRET`
- `APP_ORIGIN`
- `AMPLIFY_APP_ORIGIN`
- `AWS_REGION`
- `S3_BUCKET_NAME`

Recommended:

- store `MONGODB_URI` and `JWT_SECRET` as App Runner secrets
- use an IAM role for S3 instead of static access keys

Example values:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace-with-a-long-random-secret
APP_ORIGIN=http://localhost:5173
AMPLIFY_APP_ORIGIN=https://your-app.amplifyapp.com
AWS_REGION=us-west-2
S3_BUCKET_NAME=gadgethub-product-images
```

## 5. CORS and frontend integration

The backend allows requests from:

- `APP_ORIGIN`
- `AMPLIFY_APP_ORIGIN`
- local Vite defaults for development

After the API is live, set this variable in Amplify:

```env
VITE_API_BASE_URL=https://<your-app-runner-domain>/api
```

Without that variable, the frontend defaults to `/api`, which only works when UI and API share the same host.

## 6. Validate the deployment

Check these URLs after the App Runner deployment finishes:

- `https://<app-runner-domain>/api/health`
- `https://<app-runner-domain>/api/products`

Expected behavior:

- `/api/health` returns JSON
- `/api/products` returns paginated product data
- protected routes return `401` or `403` without a valid token

## 7. Operational notes

- App Runner should stream application logs to CloudWatch automatically.
- MongoDB transactions are used during checkout, so the production Atlas deployment must support transactions.
- If S3 upload is not configured, the upload route returns a helpful `503` message and managers can still use direct image URLs manually.

## 8. What App Runner is not doing here

This App Runner service is not intended to host the Amplify SPA in production.

The backend still contains optional static-file serving so local combined runs continue to work, but the intended cloud deployment is:

- Amplify for the SPA
- App Runner for `/api/*`
