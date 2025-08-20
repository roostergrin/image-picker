import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URLS } from '@/config/backend';

// Helper function to get API key from request headers
function getApiKeyFromRequest(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || 
         request.headers.get('x-api-key') ||
         null;
}

async function tryBackendRequest(searchParams: URLSearchParams, apiKey: string | null) {
  let lastError: Error | null = null;

  for (const baseUrl of BACKEND_URLS) {
    try {
      const backendUrl = new URL('/adobe/auth/search-licensed', baseUrl);
      
      // Copy all search parameters
      searchParams.forEach((value, key) => {
        backendUrl.searchParams.append(key, value);
      });

      console.log('Attempting to connect to backend:', backendUrl.toString());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add X-API-Key header if available
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
        console.log('🔑 Adding X-API-Key header to request');
      } else {
        console.log('❌ No X-API-Key found in request headers');
      }

      console.log('📤 Request headers:', Object.keys(headers));

      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers,
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
      console.log('Successfully fetched data from backend:', baseUrl);
      return data;

    } catch (error) {
      console.error(`Failed to connect to ${baseUrl}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next URL
    }
  }

  // If all backend URLs failed, throw the last error
  throw lastError || new Error('All backend URLs failed');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract API key from request headers
    const apiKey = getApiKeyFromRequest(request);
    console.log('🔍 Incoming request headers check:');
    console.log('  - X-API-Key:', request.headers.get('X-API-Key') ? '✅ Present' : '❌ Missing');
    console.log('  - x-api-key:', request.headers.get('x-api-key') ? '✅ Present' : '❌ Missing');
    console.log('  - Extracted apiKey:', apiKey ? '✅ Found' : '❌ Not found');
    
    // Try to connect to the actual backend
    const data = await tryBackendRequest(searchParams, apiKey);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API route error:', error);
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