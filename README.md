# OSSR Job Portal Backend (Next.js + MongoDB)

Complete backend system for your Angular job portal frontend.

## Tech Stack

- Next.js (App Router API routes)
- MongoDB + Mongoose
- JWT authentication
- Password hashing with bcryptjs
- Role-based access control (admin/user)

## 1. Project Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Backend will run on:

- `http://localhost:3000`

## 2. Environment Variables

Add in `.env.local`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ossr
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:4200
```

## 3. Folder Structure

```txt
ossr-backend/
  src/
    app/
      api/
        health/route.js
        auth/
          register/route.js
          login/route.js
          me/route.js
        jobs/
          route.js
          [id]/route.js
          [id]/apply/route.js
        applications/
          route.js
          my/route.js
      page.js
    lib/
      db.js
      jwt.js
      apiResponse.js
    middleware/
      auth.js
    models/
      User.js
      Job.js
      Application.js
  .env.example
  .gitignore
  jsconfig.json
  next.config.mjs
  package.json
```

## 4. Data Models

### User

- `name` (string, required)
- `email` (string, required, unique)
- `password` (string, required, hashed)
- `role` (`admin` or `user`, default: `user`)

### Job

- `title`, `company`, `description`, `location`, `category` (required)
- `salary` (number, required)
- `createdBy` (reference to User)

### Application

- `user` (reference to User)
- `job` (reference to Job)
- `coverLetter` (optional)
- `resumeUrl` (optional)
- `status` (`applied`, `reviewed`, `shortlisted`, `rejected`)
- unique index on `(user, job)` prevents duplicate applications

## 5. Authentication and Authorization

- JWT is returned on register/login.
- Send token in header:

```http
Authorization: Bearer <token>
```

- Protected role rules:
- Admin only: create/update/delete jobs, list all applications
- User/Admin: apply to jobs, list own profile and own applications

## 6. API Endpoints

### Health

- `GET /api/health`
- `GET /api/health/ready` (checks MongoDB connectivity and returns `503` when DB is unavailable)

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)

### Jobs

- `GET /api/jobs`
- `POST /api/jobs` (admin)
- `GET /api/jobs/:id`
- `PUT /api/jobs/:id` (admin)
- `DELETE /api/jobs/:id` (admin)
- `POST /api/jobs/:id/apply` (user/admin)

### Applications

- `GET /api/applications/my` (user/admin)
- `GET /api/applications` (admin)

## 7. Job Filtering API

`GET /api/jobs` supports:

- `location` (string, partial match)
- `category` (string, partial match)
- `minSalary` (number)
- `maxSalary` (number)
- `keyword` (searches title, company, description)
- `page` (default 1)
- `limit` (default 10)

Example:

```http
GET /api/jobs?location=Bangalore&category=Engineering&minSalary=50000&maxSalary=150000&keyword=frontend&page=1&limit=10
```

## 8. Example API Responses

### Register Success (`201`)

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "<jwt_token>",
    "user": {
      "id": "65f3...",
      "name": "Sushma",
      "email": "sushma@example.com",
      "role": "user"
    }
  }
}
```

### Login Failure (`401`)

```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": null
}
```

### Create Job Success (`201`, Admin)

```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "_id": "65f4...",
    "title": "Angular Developer",
    "company": "TechWave",
    "location": "Hyderabad",
    "category": "Engineering",
    "salary": 120000,
    "description": "Build modern SPA applications.",
    "createdBy": "65f3...",
    "createdAt": "2026-03-12T09:00:00.000Z",
    "updatedAt": "2026-03-12T09:00:00.000Z"
  }
}
```

### Filter Jobs Success (`200`)

```json
{
  "success": true,
  "message": "Jobs fetched successfully",
  "data": {
    "jobs": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    }
  }
}
```

### Apply Job Success (`201`)

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "_id": "65f5...",
    "user": "65f3...",
    "job": "65f4...",
    "coverLetter": "I am excited to apply.",
    "resumeUrl": "https://example.com/resume.pdf",
    "status": "applied"
  }
}
```

## 9. Angular Frontend Integration

### Step 1: Add API base URL

In Angular `environment.ts`:

```ts
export const environment = {
  production: false,
  apiBaseUrl: "http://localhost:3000/api"
};
```

### Step 2: Create Auth Interceptor (JWT)

Attach token from local storage/session storage:

```ts
const token = localStorage.getItem("token");
if (token) {
  req = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}
```

### Step 3: Angular service endpoint mapping

- Register: `POST ${apiBaseUrl}/auth/register`
- Login: `POST ${apiBaseUrl}/auth/login`
- Current user: `GET ${apiBaseUrl}/auth/me`
- Jobs list/filter: `GET ${apiBaseUrl}/jobs`
- Job details: `GET ${apiBaseUrl}/jobs/:id`
- Create job (admin): `POST ${apiBaseUrl}/jobs`
- Update job (admin): `PUT ${apiBaseUrl}/jobs/:id`
- Delete job (admin): `DELETE ${apiBaseUrl}/jobs/:id`
- Apply job: `POST ${apiBaseUrl}/jobs/:id/apply`
- My applications: `GET ${apiBaseUrl}/applications/my`

### Step 4: Enable CORS when Angular runs on another origin

If Angular app runs on a different port/domain, add CORS headers in Next.js middleware or route handlers.

Minimal route-level example:

```js
const headers = {
  "Access-Control-Allow-Origin": "http://localhost:4200",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
```

If both frontend and backend are served from the same domain, you do not need CORS.

## 10. Quick Test Flow

1. Register user/admin.
2. Login and store JWT.
3. Admin creates jobs.
4. Frontend fetches/filter jobs.
5. User opens job details and applies.
6. User checks `/applications/my`.
7. Admin checks `/applications`.

---

This backend is ready to connect with your existing Angular UI.
