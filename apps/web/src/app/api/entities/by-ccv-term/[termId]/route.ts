import { NextRequest, NextResponse } from 'next/server';

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:8001';

export async function GET(
  request: NextRequest,
  { params }: { params: { termId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const { termId } = params;

    // Build query params for the backend
    const queryParams = new URLSearchParams();

    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '20';
    const mappingType = searchParams.get('mapping_type');
    const minConfidence = searchParams.get('min_confidence');

    queryParams.set('page', page);
    queryParams.set('page_size', pageSize);

    if (mappingType) {
      queryParams.set('mapping_type', mappingType);
    }

    if (minConfidence) {
      queryParams.set('min_confidence', minConfidence);
    }

    const response = await fetch(
      `${GRAPH_SERVICE_URL}/api/v1/entities/by-ccv-term/${termId}?${queryParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch entities: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching entities by CCV term:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities by CCV term' },
      { status: 500 }
    );
  }
}
