import { NextRequest, NextResponse } from 'next/server';

/**
 * Photo proxy for Google Places photos.
 *
 * GET /api/photo?ref=places/PLACE_ID/photos/PHOTO_REF&maxWidth=400
 *
 * Proxies the request to Google Places API with the server-side API key,
 * keeping the key secret from the client. Caches aggressively.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const photoRef = searchParams.get('ref');
  const maxWidth = searchParams.get('maxWidth') || '400';

  if (!photoRef) {
    return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    // Google Places Photos (New) endpoint
    const googleUrl = `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;

    const response = await fetch(googleUrl, {
      headers: {
        'Accept': 'image/*',
      },
      // Follow redirects (Google returns a redirect to the actual image)
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Google API returned ${response.status}` },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800', // 7 days
        'CDN-Cache-Control': 'public, max-age=604800', // Vercel edge cache
      },
    });
  } catch (err) {
    console.error('[Photo Proxy] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 502 });
  }
}
