import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      // Call the auth service logout endpoint
      await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
      }).catch(() => {
        // Ignore errors - we'll clear client state anyway
      });
    }

    // Return success - client will clear its own state
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    // Still return success - client should clear state
    return NextResponse.json({ success: true });
  }
}

export async function GET() {
  // Redirect to home after logout
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
}
