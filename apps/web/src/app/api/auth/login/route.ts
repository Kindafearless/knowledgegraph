import { NextResponse } from 'next/server';

// For local development, redirect to main page (auto-login handles auth)
// In production with Cognito, this would initiate OAuth flow
export async function GET() {
  const isLocalDev = process.env.NODE_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

  if (isLocalDev) {
    // Redirect to home - auto-login will handle authentication
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
  }

  // In production, would redirect to Cognito hosted UI
  // For now, redirect to login page
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
}
