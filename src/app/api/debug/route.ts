import { NextResponse } from 'next/server';
import { getDebugUrls } from '@/config/backend';

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
  const testUrls = getDebugUrls();

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