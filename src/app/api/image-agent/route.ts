import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URLS } from '@/config/backend';

/**
 * Proxy requests to the image-agent backend endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get API key from request headers
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
    
    let lastError: Error | null = null;

    for (const baseUrl of BACKEND_URLS) {
      try {
        const backendUrl = new URL('/adobe/image-agent/find-images', baseUrl);
        
        console.log('🔍 Image Agent: Attempting backend:', backendUrl.toString());

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }

        const response = await fetch(backendUrl.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120000), // 2 minute timeout - agent calls can take a while
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend error:', errorText);
          throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Image Agent: Success from', baseUrl);
        return NextResponse.json(data);

      } catch (error) {
        console.error(`Failed to connect to ${baseUrl}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error('All backend URLs failed');

  } catch (error) {
    console.error('Image agent API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET version for simple testing
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const title = searchParams.get('title') || 'Test Section';
  const category = searchParams.get('category') || null;
  const keywords = searchParams.get('keywords')?.split(',') || null;
  
  // Convert to POST body
  const body = {
    title,
    category,
    keywords,
    licensed_limit: 10,
    catalog_limit: 10,
    use_agent_reasoning: false
  };

  // Create a new request with POST body
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body)
  });

  return POST(postRequest);
}

