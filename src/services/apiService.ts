import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

let inMemoryInternalApiKey: string | null = null;

export function setInMemoryInternalApiKey(token: string | null) {
  inMemoryInternalApiKey = token && token.length > 0 ? token : null;
}

function getInternalApiKey(): string | null {
  try {
    const fromMemory = inMemoryInternalApiKey;
    const fromEnvRaw = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN || null;
    const fromEnv = typeof fromEnvRaw === 'string'
      ? fromEnvRaw.split(',')[0]?.trim()
      : null;
    const chosen = fromMemory || fromEnv || null;
    return chosen && chosen.length > 0 ? chosen : null;
  } catch {
    const fallbackRaw = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN || null;
    const fallback = typeof fallbackRaw === 'string' ? fallbackRaw.split(',')[0]?.trim() : null;
    return fallback && fallback.length > 0 ? fallback : null;
  }
}

class APIClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add X-API-Key header
    this.instance.interceptors.request.use(
      (config) => {
        const internalApiKey = getInternalApiKey();
        console.log('🔧 API Client Request Interceptor:');
        console.log('  - URL:', config.url);
        console.log('  - Method:', config.method?.toUpperCase());
        console.log('  - Internal API Key:', internalApiKey ? '✅ Found' : '❌ Not found');
        if (internalApiKey) {
          config.headers['X-API-Key'] = internalApiKey;
          console.log('  - Added X-API-Key header: ✅');
        } else {
          console.log('  - X-API-Key header: ❌ Not added');
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async get(url: string, config?: AxiosRequestConfig) {
    return this.instance.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.instance.delete(url, config);
  }

  // Method to make requests to backend with proper authentication
  async makeBackendRequest(backendUrls: string[], endpoint: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    params?: Record<string, any>;
  } = {}) {
    const { method = 'GET', data, params } = options;
    let lastError: Error | null = null;

    for (const baseUrl of backendUrls) {
      try {
        const url = new URL(endpoint, baseUrl);
        
        // Add query parameters
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });
        }

        console.log(`Attempting to connect to backend: ${url.toString()}`);

        const config: AxiosRequestConfig = {
          method,
          url: url.toString(),
          timeout: 10000, // 10 second timeout
        };

        if (data && (method === 'POST' || method === 'PUT')) {
          config.data = data;
        }

        const response = await this.instance.request(config);
        console.log(`Successfully connected to backend: ${baseUrl}`);
        return response.data;

      } catch (error) {
        console.error(`Failed to connect to ${baseUrl}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue to next URL
      }
    }

    // If all backend URLs failed, throw the last error
    throw lastError || new Error('All backend URLs failed');
  }
}

export const apiClient = new APIClient();
export default apiClient;