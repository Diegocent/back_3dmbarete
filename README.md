# Node.js TypeScript Clean Architecture Template

**Despliegue en Hostinger (API Node, sin Docker):** conectá el repo en GitHub al panel, **root = `back`**, build `npm ci && npm run build`, start `npm start`. Guía: [`deploy/HOSTINGER-API-NODE.md`](../deploy/HOSTINGER-API-NODE.md). ZIP de respaldo: `back/scripts/package-hostinger-node-zip.ps1`.

---

This project is a robust boilerplate for building scalable backend applications with Node.js and TypeScript, following Clean Architecture principles.

## 🚀 Features

- **TypeScript**: Typed language for better tooling and error catching.
- **Clean Architecture**: Separation of concerns (Controllers, Services, Repositories).
- **Swagger UI**: Automatic API documentation.
- **Winston Logger**: Production-ready logging.
- **Environment Configuration**: Secure environment variable management.
- **Scalable Structure**: Ready to grow with your project.

## 📂 Project Structure

```
src/
├── config/         # Environment variables and configuration (Logger, DB config)
├── controllers/    # Request handlers (handle HTTP request/response)
├── middlewares/    # Express middlewares (Error handling, Validation)
├── models/         # App Data Models / DTOs
├── repositories/   # Data Access Layer (Interact with Database)
├── routes/         # API Route definitions
├── services/       # Business Logic Layer
├── app.ts          # Express App setup
└── index.ts        # Entry point (Server listener)
```

## 🛠️ Usage Guide

### 1. Setup
Copy the environment file and install dependencies:
```bash
cp .env.template .env
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3056`.
Swagger Documentation will be available at `http://localhost:3056/api-docs`.

### 3. Creating a New Resource (e.g., Products)

1.  **Model**: Create `src/models/Product.ts` defining the interface.
2.  **Repository**: Create `src/repositories/ProductRepository.ts`. Define `IProductRepository` and implement it (connect to your real DB).
3.  **Service**: Create `src/services/ProductService.ts`. Inject the repository and write business logic.
4.  **Controller**: Create `src/controllers/ProductController.ts`. Handle requests and call the service.
5.  **Route**: Create `src/routes/product.routes.ts`. Define endpoints and add Swagger comments.
6.  **Register**: Import and use the new route in `src/app.ts`:
    ```typescript
    import productRoutes from './routes/product.routes';
    // ...
    app.use('/products', productRoutes);
    ```

## 📝 API Documentation (Swagger)

We use `swagger-jsdoc` to generate documentation from comments in your route files.
To add a new endpoint to Swagger, add JSDoc comments above your route definition in `src/routes/*.ts`.

Example:
```typescript
/**
 * @swagger
 * /my-endpoint:
 *   get:
 *     summary: Description of what this does
 *     responses:
 *       200:
 *         description: Success
 */
```

## 🗄️ Database Integration

Currently, this template uses an **In-Memory Mock Repository** (`MockUserRepository`).
To connect a real database (PostgreSQL, MongoDB, etc.):

1.  Install the driver/ORM (e.g., `npm install mongoose` or `npm install pg typeorm`).
2.  Update `src/config` to connect to the DB.
3.  Create a concrete implementation of the Repository interface (e.g., `MongoUserRepository` or `PostgresUserRepository`) that implements `IUserRepository`.
4.  Inject this new repository into the Service in `src/routes/user.routes.ts` (or use a DI container).

## 📄 License

This project is released under a personal permissive license.
You are free to use it for any purpose, as long as proper attribution is given
to the original author: **Tobias Jara**.
