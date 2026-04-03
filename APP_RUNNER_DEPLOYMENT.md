# Deploying GadgetHub to AWS App Runner from GitHub

This guide walks through deploying this repository to AWS App Runner directly from GitHub.

It is written for this codebase as it exists now:

- The repository root contains `package.json` and `apprunner.yaml`.
- The React frontend is built with Vite.
- The Express backend serves the API and, in production, serves the built frontend from `dist/`.
- MongoDB Atlas is used as the database.

If you follow these steps, App Runner will build the app from GitHub, start a single Node.js service, and serve both:

- the frontend at `/`
- the API at `/api/*`

## 1. Understand what App Runner will deploy

This repository is already set up for App Runner.

Relevant files:

- `apprunner.yaml`
- `package.json`
- `server/index.js`

What they do:

- `apprunner.yaml` tells App Runner how to build and run the service.
- `npm run build` creates the frontend build in `dist/`.
- `npm run start` runs the Express server.
- `server/index.js` serves the frontend files from `dist/` and keeps the API under `/api`.

Important consequence:

- The App Runner source directory must be the repository root.
- Do not point App Runner at `server/`.
- Do not point App Runner at `src/`.

If you choose the wrong source directory, App Runner will not find the correct `apprunner.yaml` and scripts.

## 2. Prerequisites

Before you start, make sure you have:

1. An AWS account with permission to create App Runner services.
2. A GitHub repository containing this project.
3. A MongoDB Atlas cluster.
4. A MongoDB Atlas database user with read/write access.
5. A valid Atlas connection string.
6. Atlas network access configured so App Runner can reach the cluster.

For this project, you should also have already fixed the placeholder value in `.env` locally. A real URI looks like this:

```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.abcde.mongodb.net/gadgethub?retryWrites=true&w=majority&appName=Cluster0
```

It must not contain:

- `<username>`
- `<password>`
- `<cluster-url>`

## 3. Prepare the repository before deploying

Do this locally first.

### 3.1 Confirm the repo builds

Run:

```bash
npm install
npm run lint
npm run build
```

Expected result:

- lint passes
- Vite builds successfully
- a `dist/` folder is created

### 3.2 Confirm the app can run as one service

If your local `.env` contains a real Atlas URI, test the production-style server:

```bash
npm run build
npm run start
```

Then open:

- `http://localhost:5000/`
- `http://localhost:5000/api/health`

If you want to simulate App Runner more closely, run with port `8080`:

```bash
PORT=8080 npm run start
```

Then open:

- `http://localhost:8080/`
- `http://localhost:8080/api/health`

### 3.3 Seed the Atlas database if needed

App Runner will not automatically run `npm run seed` during deployment.

If your Atlas database is still empty, seed it before or after deployment from your local machine:

```bash
npm run seed
```

That command connects to whatever cluster your `MONGODB_URI` points to, so make sure it targets the correct Atlas project and database.

### 3.4 Push the latest code to GitHub

Commit and push the App Runner-related files before creating the service:

- `apprunner.yaml`
- `server/index.js`
- `package.json`
- any other recent deployment changes

App Runner deploys from GitHub, not from your local working tree.

## 4. Prepare MongoDB Atlas for a cloud deployment

This is the part most likely to break the deployment if skipped.

### 4.1 Create or verify the database user

In Atlas:

1. Open your project.
2. Go to `Database Access`.
3. Make sure you have a database user.
4. Confirm the username and password are the ones used in `MONGODB_URI`.

If the password contains special characters like `@`, `#`, `%`, `/`, or `:`, URL-encode it in the URI.

### 4.2 Configure network access

In Atlas:

1. Open your project.
2. Go to `Network Access` or `Database & Network Access`.
3. Add an entry that allows connections from your deployment environment.

For an initial App Runner deployment, many teams temporarily use:

```text
0.0.0.0/0
```

This allows access from anywhere. It is the simplest way to confirm the app works end to end.

Security tradeoff:

- `0.0.0.0/0` is broad access.
- Only use it if you also have strong database credentials.
- Tightening Atlas network rules later is better once the deployment is working.

If your organization requires stricter networking, plan that separately before production rollout.

### 4.3 Copy the exact Atlas connection string

In Atlas:

1. Go to `Database`.
2. Click `Connect`.
3. Choose `Drivers`.
4. Select `Node.js`.
5. Copy the full `mongodb+srv://...` connection string.
6. Replace the placeholder username, password, and database name.

Use your application database name in the URI. For this project, `gadgethub` is a reasonable default.

## 5. Create the App Runner service from GitHub

### 5.1 Open App Runner

In AWS:

1. Open the AWS Management Console.
2. Search for `App Runner`.
3. Open the App Runner console.
4. Click `Create service`.

### 5.2 Choose source code as the deployment type

On the create-service flow:

1. Choose `Source code repository`.
2. Choose `GitHub` as the provider.

If this is your first App Runner deployment from GitHub:

1. Create the GitHub connection when prompted.
2. Authorize AWS App Runner to access your GitHub account or organization.
3. Choose whether to grant access to all repositories or only selected repositories.

If you use a GitHub organization, make sure the repository is visible to the App Runner GitHub connection.

### 5.3 Select the correct repository and branch

Choose:

1. The GitHub repository that contains this project.
2. The branch you want App Runner to deploy.

For example:

- repository: your GadgetHub repo
- branch: `main`

### 5.4 Set the source directory

This repository must use the repository root as the source directory.

Use one of these approaches:

- leave the source directory blank, if the console treats blank as repository root
- enter `/`
- enter the repository root path exactly as App Runner expects

Do not set the source directory to:

- `server`
- `src`
- `dist`

Reason:

- `apprunner.yaml` is in the repository root
- `package.json` is in the repository root
- App Runner runs build and start commands from the source directory

### 5.5 Choose deployment settings

You will be asked whether deployments are:

- `Automatic`
- `Manual`

Recommended for a student team:

- start with `Manual` if you want to validate the first deployment carefully
- switch to `Automatic` later if you want every push to redeploy the service

If you choose automatic deployment, every push to the selected branch can trigger a new deployment.

## 6. Tell App Runner to use the repository configuration file

When App Runner reaches the build configuration step:

1. Choose `Use a configuration file`.
2. Do not manually type build and start commands in the console.

This repository already includes:

```yaml
version: 1.0
runtime: nodejs22

build:
  commands:
    pre-build:
      - npm ci
    build:
      - npm run build
    post-build:
      - npm prune --omit=dev

run:
  command: npm run start
  network:
    port: 8080
```

That means App Runner will:

1. install dependencies with `npm ci`
2. build the React app with `npm run build`
3. remove dev dependencies from the runtime image
4. start the service with `npm run start`
5. send traffic to port `8080`

Important:

- Because the config file sets `run.network.port: 8080`, App Runner will provide `PORT=8080` at runtime.
- You do not need to hardcode port `8080` in the application.
- The app already reads `process.env.PORT`.

## 7. Configure service settings

On the App Runner service settings step, choose:

### 7.1 Service name

Pick a clear name, for example:

```text
gadgethub-webapps
```

### 7.2 CPU and memory

For an initial deployment, modest values are fine.

Choose something small and cheap first, then increase later if needed.

### 7.3 Port

If the console asks for a port while also using the config file, follow the console rules. In this repo, the intended port is:

```text
8080
```

### 7.4 Health check

If the App Runner setup screen exposes health-check configuration, use:

- protocol: `HTTP`
- path: `/api/health`

Why this path is better than `/`:

- it confirms the Node service is alive
- it does not depend on frontend rendering
- it stays stable even if the UI changes

## 8. Add runtime environment variables

This step is critical.

App Runner does not use your local `.env` file unless you commit it, and you should not commit secrets.

Add your Atlas connection string in App Runner as a runtime environment value.

### 8.1 Minimum required runtime variable

Add:

```text
MONGODB_URI = your-real-atlas-connection-string
```

Use the full real value, not the placeholder example.

### 8.2 Variables you do not need to set

You usually do not need to set:

- `PORT`
- `VITE_API_BASE_URL`

Why:

- `PORT` is managed by App Runner from the configured network port.
- The frontend defaults to `/api`, which is correct when the frontend and backend are served by the same App Runner service.

### 8.3 Prefer secrets for production

For production, it is better to store sensitive values in:

- AWS Secrets Manager
- or AWS Systems Manager Parameter Store

Then reference them in App Runner instead of storing the URI as plain text.

For a first deployment, plain-text environment variables in the App Runner console are simpler. After the service works, move the URI into a managed secret.

## 9. Review and create the service

Before clicking create:

1. Confirm the repository is correct.
2. Confirm the branch is correct.
3. Confirm the source directory is the repository root.
4. Confirm the configuration source is the repository file.
5. Confirm `MONGODB_URI` is set.
6. Confirm the service uses port `8080`.

Then click `Create & deploy`.

App Runner will now:

1. pull code from GitHub
2. build the app
3. start the Node.js service
4. provision a public service URL

The first deployment can take several minutes.

## 10. Verify the deployment after App Runner finishes

After the service status changes to running, test these URLs.

### 10.1 Health endpoint

Open:

```text
https://YOUR_SERVICE_URL/api/health
```

Expected response:

```json
{"status":"ok"}
```

### 10.2 Frontend home page

Open:

```text
https://YOUR_SERVICE_URL/
```

Expected behavior:

- the React app loads
- product cards appear if the database has product data
- if the database is empty, the app shows the empty-state message instead of crashing

### 10.3 Products API

Open:

```text
https://YOUR_SERVICE_URL/api/products
```

Expected behavior:

- you receive a JSON array of products

If the array is empty:

- the deployment succeeded
- your database likely just has no products yet
- run the seed command locally against the same Atlas cluster

## 11. Redeploying after future GitHub pushes

How future updates work depends on the deployment mode you chose earlier.

If you selected automatic deployments:

- pushing to the tracked branch triggers a new App Runner deployment

If you selected manual deployments:

- pushes alone do not redeploy
- you must start a new deployment from the App Runner console

Good practice:

1. test locally first
2. push to GitHub
3. let App Runner redeploy
4. re-check `/api/health` and the home page

## 12. Common failure modes and fixes

### Error: `querySrv EBADNAME _mongodb._tcp.<cluster-url>`

Cause:

- `MONGODB_URI` still contains placeholder text

Fix:

- replace the placeholder with the real Atlas URI

### Error: database authentication failed

Cause:

- wrong Atlas username or password
- password not URL-encoded

Fix:

1. verify the Atlas database user exists
2. verify the password
3. URL-encode special characters in the password

### Error: App Runner deploys but the UI does not load

Cause:

- wrong source directory
- App Runner did not use the repository root
- build did not produce `dist/`

Fix:

1. confirm source directory is repository root
2. confirm `apprunner.yaml` is in that directory
3. confirm `npm run build` succeeds locally

### Error: `/api/health` works but `/api/products` fails

Cause:

- the service started, but MongoDB connection failed later or Atlas blocked access

Fix:

1. check App Runner logs
2. verify `MONGODB_URI`
3. verify Atlas network access rules
4. verify Atlas user permissions

### Error: homepage loads but there are no products

Cause:

- Atlas database is empty

Fix:

Run locally against the same Atlas cluster:

```bash
npm run seed
```

### Error: App Runner cannot find commands or files

Cause:

- source directory was set to `server/` or another subdirectory

Fix:

- redeploy with source directory set to the repository root

### Warning: local Node version does not match Vite recommendation

Current local issue seen during development:

- Vite warns when running on Node `22.11.0`
- Vite prefers `22.12.0+` or `20.19.0+`

This is mostly a local development concern.

App Runner uses its own Node runtime defined by `apprunner.yaml`:

```yaml
runtime: nodejs22
```

Still, upgrading your local Node installation is a good cleanup step.

## 13. Recommended first deployment checklist

Use this checklist before clicking deploy:

- code pushed to GitHub
- `apprunner.yaml` present in repo root
- source directory set to repo root
- `MONGODB_URI` is real and not a placeholder
- Atlas user exists
- Atlas network access allows the deployment to connect
- `npm run build` works locally
- database seeded if you want products visible immediately

## 14. Recommended post-deployment checklist

Use this checklist after the service is live:

- `/api/health` returns `{"status":"ok"}`
- `/api/products` returns JSON
- `/` loads the frontend
- product detail routes load
- App Runner logs show no MongoDB connection errors
- future GitHub pushes deploy the way you expect

## 15. Optional next improvements

After the first successful deployment, these are sensible next steps:

1. Move `MONGODB_URI` into AWS Secrets Manager.
2. Tighten Atlas network access rules.
3. Add a custom domain in App Runner.
4. Add structured logging.
5. Add a real production health-check strategy.
6. Add CI checks before automatic deployment.

## Official documentation

These instructions were aligned with the official AWS and MongoDB docs used during setup:

- AWS App Runner source code services: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code.html
- AWS App Runner create service flow: https://docs.aws.amazon.com/apprunner/latest/dg/manage-create.html
- AWS App Runner configuration files: https://docs.aws.amazon.com/apprunner/latest/dg/config-file.html
- AWS App Runner configuration file reference: https://docs.aws.amazon.com/apprunner/latest/dg/config-file-ref.html
- AWS App Runner environment variables and secrets: https://docs.aws.amazon.com/apprunner/latest/dg/env-variable-manage.html
- MongoDB Atlas IP access list: https://www.mongodb.com/docs/atlas/security/ip-access-list/
