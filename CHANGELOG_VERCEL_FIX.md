# Fix: Vercel Deployment "Failed to fetch" Error

## Problem
The dashboard service was failing to load on Vercel deployment (https://ajob-4-agent.vercel.app/) with a "Failed to fetch" error.

## Root Cause
The dashboard page (`services/dashboard-service/src/app/page.tsx`) had a hardcoded API URL:
```typescript
const API_URL = 'http://localhost:8001/api/logs';
```

This URL only works in local development and fails when deployed to Vercel because:
1. `localhost` doesn't exist in the Vercel deployment environment
2. The monitoring service at port 8001 is not available in the browser context

## Solution
Updated the API URL to use the environment variable `NEXT_PUBLIC_API_URL` in commit 75df9a1:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/logs`
  : '/api/logs';
```

### Additional Improvements
1. **Better Error Handling**: Added loading state and more informative error messages
2. **User Experience**: Shows a friendly notice when the backend service is unavailable
3. **Empty State**: Displays appropriate message when no logs are available

## Testing
- ✅ Build succeeds: `npm run build`
- ✅ Linting passes: `npm run lint`
- ✅ Tests pass: `npm test`
- ✅ Development server runs correctly
- ✅ Health endpoint works: `/api/health`

## Configuration
To set the API URL in Vercel:
1. Go to Vercel project settings
2. Add environment variable: `NEXT_PUBLIC_API_URL` with the backend API URL
3. Redeploy the application

For local development, the default fallback URL `/api/logs` will be used, which will be proxied through Next.js rewrites configuration in `services/dashboard-service/next.config.js`:

```javascript
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return [
    {
      source: '/api/:path*',
      destination: `${apiUrl}/api/:path*`,
    },
  ]
}
```

This allows the frontend to make API calls to `/api/*` which are automatically proxied to the backend service.
