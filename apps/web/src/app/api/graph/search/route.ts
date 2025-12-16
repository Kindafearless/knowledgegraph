import { NextRequest, NextResponse } from 'next/server';

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/queries/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Search failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Graph search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search graph' },
      { status: 500 }
    );
  }
}
