import { NextRequest, NextResponse } from 'next/server';

// Disable SSL verification for localhost development
// This is safe for localhost but should NOT be used in production
if (process.env.NODE_ENV === 'development') {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
}

// Try both HTTP and HTTPS endpoints
const BACKEND_URLS = [
  'https://localhost:8000',  // User's preferred HTTPS
  'http://localhost:8000'    // Fallback to HTTP
];

async function tryBackendRequest(searchParams: URLSearchParams) {
  let lastError: Error | null = null;

  for (const baseUrl of BACKEND_URLS) {
    try {
      const backendUrl = new URL('/auth/adobe/search-licensed', baseUrl);
      
      // Copy all search parameters
      searchParams.forEach((value, key) => {
        backendUrl.searchParams.append(key, value);
      });

      console.log('Making request to:', backendUrl.toString());

      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Backend request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Successfully fetched data from:', baseUrl);
      return data;

    } catch (error) {
      console.error(`Failed to connect to ${baseUrl}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next URL
    }
  }

  throw lastError || new Error('All backend URLs failed');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const data = await tryBackendRequest(searchParams);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from backend',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        triedUrls: BACKEND_URLS
      },
      { status: 500 }
    );
  }
} 