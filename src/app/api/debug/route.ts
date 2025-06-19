import { NextResponse } from 'next/server';

// Disable SSL verification for localhost development
if (process.env.NODE_ENV === 'development') {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
}

async function testConnection(url: string): Promise<{ url: string; status: string; details?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
    });
    
    clearTimeout(timeoutId);
    
    return {
      url,
      status: `✅ Connected - HTTP ${response.status}`,
      details: response.statusText
    };
  } catch (error) {
    return {
      url,
      status: `❌ Failed`,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function GET() {
  // Test common ports and endpoints
  const testUrls = [
    'http://localhost:8000',
    'https://localhost:8000',
    'http://localhost:8000/health',
    'http://localhost:8000/docs',
    'http://localhost:8000/auth/adobe/search-licensed',
    'https://localhost:8000/auth/adobe/search-licensed',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://127.0.0.1:8000',
  ];

  console.log('Running connectivity diagnostics...');
  
  const results = await Promise.all(
    testUrls.map(url => testConnection(url))
  );

  return NextResponse.json({
    message: 'Backend connectivity diagnostics',
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.status.includes('✅')).length,
      failed: results.filter(r => r.status.includes('❌')).length
    }
  });
} 