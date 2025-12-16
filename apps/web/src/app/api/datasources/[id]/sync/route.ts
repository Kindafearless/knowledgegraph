import { NextRequest, NextResponse } from 'next/server';

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:8001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/datasources/${id}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to sync data source: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error syncing data source:', error);
    return NextResponse.json(
      { error: 'Failed to sync data source' },
      { status: 500 }
    );
  }
}
