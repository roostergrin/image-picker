// Backend configuration based on environment
const getBackendUrls = () => {
  // Check multiple indicators for production environment
  const useProduction = 
    process.env.NEXT_PUBLIC_USE_PRODUCTION_BACKEND === 'true' ||
    process.env.NODE_ENV === 'production' ||
    typeof window !== 'undefined' && (
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('localhost')
    );
  
  if (useProduction) {
    // Production build: try production first, then local fallback
    return [
      'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com',
      'http://127.0.0.1:8000',
      'http://localhost:8000'
    ];
  } else {
    // Development build: try local first
    return [
      'http://127.0.0.1:8000',
      'http://localhost:8000'
    ];
  }
};

export const BACKEND_URLS = getBackendUrls();

export const getDebugUrls = () => {
  const useProduction = process.env.NEXT_PUBLIC_USE_PRODUCTION_BACKEND === 'true';
  
  const localUrls = [
    'http://localhost:8000',
    'http://localhost:8000/health',
    'http://localhost:8000/docs',
    'http://localhost:8000/auth/adobe/search-licensed',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://127.0.0.1:8000',
  ];

  if (useProduction) {
    const productionUrls = [
      'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com',
      'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com/health',
      'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com/docs',
      'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com/auth/adobe/search-licensed',
    ];
    return [...productionUrls, ...localUrls];
  }
  
  return localUrls;
};