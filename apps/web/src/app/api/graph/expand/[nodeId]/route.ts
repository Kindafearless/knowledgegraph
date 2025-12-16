import { NextRequest, NextResponse } from 'next/server';

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:8001';

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const depth = searchParams.get('depth') || '1';

    const response = await fetch(
      `${GRAPH_SERVICE_URL}/api/v1/queries/expand/${params.nodeId}?depth=${depth}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to expand node' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Graph expand API error:', error);
    return NextResponse.json(
      { error: 'Failed to expand node' },
      { status: 500 }
    );
  }
}
