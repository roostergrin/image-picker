// Backend configuration
// ALWAYS try local first, then production as fallback
// This ensures development always works with local backend
const getBackendUrls = () => {
  // Check if explicitly set to use production backend ONLY
  const productionOnly = process.env.NEXT_PUBLIC_PRODUCTION_BACKEND_ONLY === 'true';
  
  if (productionOnly) {
    return [
      'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com'
    ];
  }
  
  // Default: try local first, then production fallback
  // This way local development always works
  return [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'https://automation-tools.wjj7y49t8p9c2.us-west-2.cs.amazonlightsail.com'
  ];
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