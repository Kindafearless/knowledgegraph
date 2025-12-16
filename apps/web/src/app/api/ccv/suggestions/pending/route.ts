import { NextRequest, NextResponse } from 'next/server';

const CCV_SERVICE_URL = process.env.CCV_SERVICE_URL || 'http://localhost:8003';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${CCV_SERVICE_URL}/api/v1/suggestions/pending`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch pending suggestions: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching pending suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch pending suggestions' }, { status: 500 });
  }
}
