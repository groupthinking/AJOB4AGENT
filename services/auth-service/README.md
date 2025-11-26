# Auth Service

A standalone authentication service for AJOB4AGENT APIs providing JWT-based authentication and authorization.

## Features

- User registration and login
- JWT access and refresh tokens
- Role-based access control (USER, PREMIUM, ADMIN)
- Password hashing with bcrypt
- Request validation with Zod

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout (client-side) |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user |
| PATCH | `/api/users/me` | Update current user |
| DELETE | `/api/users/me` | Delete current user |
| GET | `/api/users` | List all users (admin) |
| PATCH | `/api/users/:id/role` | Update user role (admin) |

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_SERVICE_PORT` | Server port | 3002 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | 7d |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry | 30d |
| `APP_URL` | Frontend URL for emails | http://localhost:3001 |

## Using with Other Services

To protect API routes in other services, use the provided middleware:

```typescript
import { authenticate, authorize } from 'auth-service/middleware';

// Require authentication
app.get('/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Require specific roles
app.get('/admin', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Admin only' });
});
```

## Docker

Build and run with Docker:

```bash
docker build -t auth-service .
docker run -p 3002:3002 --env-file .env auth-service
```
