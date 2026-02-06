# Aditus Frontend

Next.js 14 React frontend with TypeScript for AI-powered career workflow agent.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Run development server
npm run dev
```

Visit `http://localhost:3000`

## Authentication Flow

1. **Signup** (`/auth/signup`) - Create account with email, name, password
2. **Login** (`/auth/login`) - Sign in to existing account
3. **Dashboard** (`/dashboard`) - Protected route with user data

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── auth/        # Auth pages (login, signup)
│   ├── dashboard/   # Protected dashboard
│   └── page.tsx     # Home page
├── components/       # React components
│   └── auth/        # Auth forms (LoginForm, SignupForm)
├── context/         # React context (AuthContext)
├── hooks/           # Custom hooks (useAuth, useIsAuthenticated)
├── lib/
│   ├── api.ts       # API client with interceptors
│   ├── auth.ts      # Auth token management
│   └── schemas.ts   # Zod schemas for validation
└── styles/          # Global CSS (Tailwind)
```

## Key Features

- **Type-safe**: Full TypeScript support with Zod schemas
- **Authentication**: JWT token management with automatic redirect
- **API Integration**: Axios client with request/response interceptors
- **Form Validation**: React Hook Form + Zod for robust validation
- **Styling**: Tailwind CSS with Kenyan Professional color scheme
- **SWR Ready**: Setup for real-time data fetching with polling

## Color Scheme (Kenyan Professional)

- **Primary**: Brand Blue (`#0055cc`)
- **Dark**: Brand Black (`#1a1a1a`)
- **Light**: Brand Grey Light (`#f5f5f5`)
- **Alert**: Brand Red (`#cc0000`)
- **Text**: Brand Grey Muted (`#666666`)

## Next Steps

1. Implement profile completion page
2. Add job URL submission form
3. Build application tracker UI
4. Add CV preview component
5. Setup real-time status polling

## Environment Variables

See `.env.example` for all required variables.
