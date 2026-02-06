# Frontend-Backend Authentication Flow

## Architecture Overview

### Authentication Stack
- **Backend**: FastAPI with JWT (python-jose) + bcrypt password hashing
- **Frontend**: Next.js with Server Actions for signup/login, client-side token storage
- **Token Storage**: Secure HTTP-only cookies (js-cookie)
- **API Proxying**: Next.js rewrites for CORS bypass (/api/v1 → http://127.0.0.1:8000/api/v1)

## Backend Implementation

### 1. Auth Endpoints

#### POST `/api/v1/auth/signup`
**Request:**
```json
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "password": "SecurePass123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2026-02-01T00:00:00",
      "updated_at": "2026-02-01T00:00:00"
    },
    "token": {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "token_type": "bearer",
      "expires_in": 3600
    }
  },
  "request_id": "req_xxx"
}
```

#### POST `/api/v1/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):** Same as signup response

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "detail": "Invalid email or password"
  }
}
```

#### GET `/api/v1/users/me`
**Headers:** `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": null,
    "location": "Nairobi",
    "professional_summary": null,
    "created_at": "2026-02-01T00:00:00",
    "updated_at": "2026-02-01T00:00:00"
  }
}
```

#### PUT `/api/v1/users/me`
**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "full_name": "John Updated",
  "location": "Nairobi, Kenya",
  "professional_summary": "..." 
}
```

**Response (200 OK):** Updated user object in ApiResponse envelope

### 2. Database Schema

**Users Table:**
```python
id (Primary Key)
email (Unique)
full_name
hashed_password (bcrypt)
phone
location
professional_summary
created_at
updated_at
```

## Frontend Implementation

### 1. Authentication Flow

#### Signup Flow
```
User fills form
↓
SignupForm validates with Zod
↓
apiClient.signup() sends POST /api/v1/auth/signup
↓
Backend validates & creates user
↓
Frontend receives token
↓
setAuthToken() stores in cookies
↓
localStorage stores user data
↓
Router pushes to /dashboard
```

#### Login Flow
```
User enters credentials
↓
LoginForm validates with Zod
↓
apiClient.login() sends POST /api/v1/auth/login
↓
Backend validates password (bcrypt)
↓
Frontend receives token
↓
setAuthToken() stores in cookies
↓
localStorage stores user data
↓
Router pushes to /dashboard
```

### 2. API Client Integration

**File:** `src/lib/api.ts`

The ApiClient automatically:
- Adds `Authorization: Bearer {token}` to all requests
- Handles 401 responses by redirecting to login
- Uses the proxied URL `/api/v1` (rewrites to backend)

```typescript
// Automatic request interceptor
this.client.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Automatic 401 handling
this.client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeAuthToken()
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)
```

### 3. UI Components

**Components:**
- `Button` - Primary, secondary, danger, ghost variants
- `Card`, `CardHeader`, `CardBody`, `CardFooter` - Card layout
- `Input`, `Select`, `TextArea` - Form inputs with validation
- `Alert` - Success, error, warning, info alerts

**Colors:**
- `bg-brand-blue` (#0055cc) - Primary actions
- `bg-brand-black` (#1a1a1a) - Dark backgrounds
- `text-brand-red` (#cc0000) - Alerts/errors
- `text-brand-grey-muted` (#666666) - Secondary text

### 4. Forms with Validation

Uses `react-hook-form` + `zod` for:
- Email validation
- Password strength (min 8 chars)
- Password confirmation matching
- Display of validation errors

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<SignupInput>({
  resolver: zodResolver(SignupSchema),
})
```

## Development Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env from .env.example
cp .env.example .env

# Run migrations (future step)
# alembic upgrade head

# Start server
python3 -m uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Docker Compose (Full Stack)
```bash
docker-compose up
# Backend: http://127.0.0.1:8000
# Frontend: http://127.0.0.1:3000
```

## Testing the Flow

### 1. Signup
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "TestPass123"
  }'
```

### 2. Login
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### 3. Get Current User
```bash
curl -X GET http://127.0.0.1:8000/api/v1/users/me \
  -H "Authorization: Bearer {access_token}"
```

## Key Files

**Backend:**
- `app/api/auth.py` - Authentication routes
- `app/api/users.py` - User profile endpoints
- `app/db/models.py` - User model with hashed_password

**Frontend:**
- `src/components/auth/LoginForm.tsx` - Login component
- `src/components/auth/SignupForm.tsx` - Signup component
- `src/lib/api.ts` - API client with interceptors
- `src/lib/auth.ts` - Token management
- `src/lib/schemas.ts` - Zod validation schemas

## Next Steps

1. **Email Verification** - Add email confirmation tokens
2. **Password Reset** - Implement forgot-password flow
3. **OAuth Integration** - Add Google/GitHub login
4. **Master Profile** - Build profile management UI
5. **Job Applications** - Implement job submission and tracking
6. **Rate Limiting** - Add request throttling
7. **Audit Logging** - Track authentication events
