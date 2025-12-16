import { NextRequest, NextResponse } from 'next/server';

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:8001';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/datasources/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch stats: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
