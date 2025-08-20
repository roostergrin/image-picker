import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URLS } from '@/config/backend';

// Helper function to get API key from request headers
function getApiKeyFromRequest(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || 
         request.headers.get('x-api-key') ||
         null;
}

async function tryBackendHealthCheck(apiKey: string | null) {
  let lastError: Error | null = null;

  for (const baseUrl of BACKEND_URLS) {
    try {
      const backendUrl = new URL('/health', baseUrl);

      console.log('Attempting health check to backend:', backendUrl.toString());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add X-API-Key header if available
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers,
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      console.log('Health check response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend health check error:', errorText);
        
        // Return more specific error information for authentication failures
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: Invalid or expired API key`);
        } else if (response.status >= 500) {
          throw new Error(`Backend server error: ${response.status} ${response.statusText}`);
        } else {
          throw new Error(`Backend health check failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Successfully connected to backend for health check:', baseUrl);
      return data;

    } catch (error) {
      console.error(`Health check failed for ${baseUrl}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next URL
    }
  }

  // If all backend URLs failed, throw the last error
  throw lastError || new Error('All backend health checks failed');
}

export async function GET(request: NextRequest) {
  try {
    // Extract API key from request headers
    const apiKey = getApiKeyFromRequest(request);
    
    // Try to connect to the backend health endpoint
    const data = await tryBackendHealthCheck(apiKey);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Health API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (errorMessage.includes('Authentication failed') || errorMessage.includes('Invalid or expired API key')) {
      statusCode = 401;
    } else if (errorMessage.includes('Backend server error')) {
      statusCode = 502; // Bad Gateway - backend server error
    } else if (errorMessage.includes('All backend health checks failed')) {
      statusCode = 503; // Service Unavailable - all backends down
    }
    
    return NextResponse.json(
      { 
        error: 'Backend health check failed',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        triedUrls: BACKEND_URLS,
        authenticated: statusCode !== 401
      },
      { status: statusCode }
    );
  }
}