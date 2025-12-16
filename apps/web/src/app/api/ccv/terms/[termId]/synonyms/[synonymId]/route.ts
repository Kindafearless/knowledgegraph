import { NextRequest, NextResponse } from 'next/server';

const CCV_SERVICE_URL = process.env.CCV_SERVICE_URL || 'http://localhost:8003';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ termId: string; synonymId: string }> }
) {
  try {
    const { termId, synonymId } = await params;
    const authHeader = request.headers.get('authorization');

    const response = await fetch(
      `${CCV_SERVICE_URL}/api/v1/terms/${termId}/synonyms/${synonymId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to delete synonym: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting synonym:', error);
    return NextResponse.json({ error: 'Failed to delete synonym' }, { status: 500 });
  }
}
