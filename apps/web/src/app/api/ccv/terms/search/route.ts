import { NextRequest, NextResponse } from 'next/server';

const CCV_SERVICE_URL = process.env.CCV_SERVICE_URL || 'http://localhost:8003';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${CCV_SERVICE_URL}/api/v1/terms/search${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to search terms: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching terms:', error);
    return NextResponse.json({ error: 'Failed to search terms' }, { status: 500 });
  }
}
