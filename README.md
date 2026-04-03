# GadgetHub WebApps

This project now has a simple full-stack path for MongoDB Atlas:

- React frontend in `src/`
- Express API in `server/`
- MongoDB Atlas connection through Mongoose

## Important

The MongoDB VS Code extension does not connect your app by itself. It only lets you inspect the database. Your application still needs a backend that uses the Atlas connection string.

## Setup

1. Create a `.env` file in the project root from `.env.example`.
2. Paste your Atlas connection string into `MONGODB_URI`.
3. Make sure your Atlas cluster allows your IP address and that your database user has read/write access.
4. Install dependencies:

```bash
npm install
```

5. Seed starter data if you want sample products:

```bash
npm run seed
```

6. Start the API:

```bash
npm run server
```

7. Start the frontend in a second terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Environment Variables

```env
MONGODB_URI=your-atlas-connection-string
PORT=5000
VITE_API_BASE_URL=/api
```

## API Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`

## Current Data Model

Products are stored in MongoDB with fields such as:

- `name`
- `description`
- `price`
- `image`
- `category`
- `inStock`

## Next Step Ideas

- Store cart data per user in MongoDB
- Add create/update/delete product routes for an admin page
- Move image URLs to a CDN or cloud storage instead of local placeholders
