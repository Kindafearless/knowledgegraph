import { NextRequest, NextResponse } from 'next/server';

const CCV_SERVICE_URL = process.env.CCV_SERVICE_URL || 'http://localhost:8003';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${CCV_SERVICE_URL}/api/v1/terms/${termId}/synonyms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to add synonym: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding synonym:', error);
    return NextResponse.json({ error: 'Failed to add synonym' }, { status: 500 });
  }
}
