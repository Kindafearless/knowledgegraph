import { NextRequest, NextResponse } from 'next/server';

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:8001';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    // Build query params for the backend
    const params = new URLSearchParams();

    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset');
    const type = searchParams.get('type');
    const dataSourceId = searchParams.get('data_source_id');
    const search = searchParams.get('search');

    // Calculate page from offset if provided
    if (offset) {
      const pageNum = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
      params.set('page', String(pageNum));
    } else {
      params.set('page', page);
    }

    params.set('page_size', limit);

    if (type) {
      params.set('type', type);
    }

    // Look up data source name from ID if needed
    if (dataSourceId) {
      // Fetch the data source to get its name
      const dsResponse = await fetch(`${GRAPH_SERVICE_URL}/api/v1/datasources/${dataSourceId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });

      if (dsResponse.ok) {
        const ds = await dsResponse.json();
        if (ds.name) {
          params.set('data_source', ds.name);
        }
      }
    }

    if (search) {
      params.set('search', search);
    }

    const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/entities?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch entities: ${response.status}` },
        { status: response.status }
      );
    }

    const entities = await response.json();

    // Fetch entity types for filtering
    let entityTypes: { name: string; count: number }[] = [];
    try {
      const typesResponse = await fetch(`${GRAPH_SERVICE_URL}/api/v1/entity-types`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });

      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        entityTypes = typesData.map((t: { name: string; entity_count?: number }) => ({
          name: t.name,
          count: t.entity_count || 0,
        }));
      }
    } catch {
      // Ignore error fetching types
    }

    // Wrap in expected format
    return NextResponse.json({
      entities: entities,
      total: entities.length,
      entity_types: entityTypes,
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}
