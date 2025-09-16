'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchFilters } from './components/SearchFilters';
import { ImageGrid } from './components/ImageGrid';
import { ImageModal } from './components/ImageModal';
import { Toast } from './components/Toast';
import { apiClient, setInMemoryInternalApiKey } from '../services/apiService';
import { ContentData } from '../utils/contentKeywordExtractor';

export interface AdobeStockImage {
  id: number;
  title: string;
  keywords: string[];
  category: string;
  creator_name: string;
  creator_id: number;
  license_date: string;
  download_url: string;
  comp_url: string;
  thumbnail_url: string;
  width: number | null;
  height: number | null;
  description: string | null;
  is_licensed: boolean;
  s3_key?: string;
  s3_bucket?: string;
  s3_url?: string;
  last_updated: string;
}

export interface SearchFilters {
  query?: string;
  keywords?: string;
  category?: string;
  creator?: string;
  keywordMode?: 'OR' | 'AND';
  content?: ContentData;
}

export interface SearchResponse {
  search_results: AdobeStockImage[];
  pagination: {
    total_count: number;
    returned_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  search_parameters: SearchFilters & {
    limit: number;
    offset: number;
  };
  retrieved_at: string;
}

const API_BASE_URL = '/api';

declare global {
  interface Window { __INTERNAL_API_TOKEN__?: string }
}

const TokenGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Attempt to load and verify a saved token on mount
  useEffect(() => {
    const saved = localStorage.getItem('INTERNAL_API_TOKEN') || localStorage.getItem('internalApiToken');
    
    if (!saved) {
      setInitialized(true);
      return;
    }
    
    setToken(saved);
    setInMemoryInternalApiKey(saved);
    window.__INTERNAL_API_TOKEN__ = saved;
    
    (async () => {
      setChecking(true);
      setError(null);
      try {
        await apiClient.get('/api/health');
        setVerified(true);
      } catch (err) {
        setInMemoryInternalApiKey(null);
        window.__INTERNAL_API_TOKEN__ = undefined;
        localStorage.removeItem('INTERNAL_API_TOKEN');
        localStorage.removeItem('internalApiToken');
        setVerified(false);
        setToken('');
        console.error('Token verification failed:', err);
      } finally {
        setChecking(false);
        setInitialized(true);
      }
    })();
  }, []);

  const verify = async () => {
    setChecking(true);
    setError(null);
    setVerified(false); // Reset verified state before attempting verification
    
    try {
      setInMemoryInternalApiKey(token);
      window.__INTERNAL_API_TOKEN__ = token;
      const response = await apiClient.get('/api/health');
      
      // Only set verified to true if we get a successful response
      if (response && response.status === 200) {
        setVerified(true);
        try {
          localStorage.setItem('INTERNAL_API_TOKEN', token);
        } catch {
          // ignore storage failures
        }
      } else {
        throw new Error('Health check failed');
      }
    } catch (err) {
      setInMemoryInternalApiKey(null);
      window.__INTERNAL_API_TOKEN__ = undefined;
      setVerified(false);
      
      // Provide more specific error messages
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        const status = axiosError.response?.status;
        if (status === 401 || status === 403) {
          setError('Invalid or expired token');
        } else if (status && status >= 500) {
          setError('Server error - please try again');
        } else {
          setError('Authentication failed');
        }
      } else {
        setError('Unable to verify token - check your connection');
      }
      console.error('Token verification failed:', err);
    } finally {
      setChecking(false);
    }
  };

  // Only render children if explicitly verified and initialized
  if (verified && initialized && !checking) return <>{children}</>;
  
  // Show loading state during initialization
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Internal Access</h2>
        <p className="text-gray-600 mb-4">Paste your internal access token to continue.</p>
        <input
          className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="password"
          value={token}
          onChange={e => {
            setToken(e.target.value);
            // Clear error when user starts typing
            if (error) setError(null);
          }}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            if (!token || checking) return;
            verify();
          }}
          placeholder="Enter token"
          aria-label="Internal access token"
          disabled={checking}
        />
        {error && <div className="text-red-600 mb-4" role="alert">{error}</div>}
        <button
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={verify}
          disabled={!token || checking}
          aria-label={checking ? 'Verifying' : 'Continue'}
        >
          {checking ? 'Verifying…' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  const [images, setImages] = useState<AdobeStockImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AdobeStockImage | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [pagination, setPagination] = useState({
    total_count: 0,
    current_page: 1,
    limit: 20,
    has_more: false
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const searchImages = useCallback(async (filters: SearchFilters, page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.keywords) params.append('keywords', filters.keywords);
      if (filters.category) params.append('category', filters.category);
      if (filters.creator) params.append('creator', filters.creator);
      if (filters.keywordMode) params.append('keywordMode', filters.keywordMode);
      
      // Add content data as JSON if provided
      if (filters.content) {
        params.append('content', JSON.stringify(filters.content));
      }
      
      const limit = 20; // Use static limit instead of pagination.limit
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      const response = await apiClient.get(`${API_BASE_URL}/adobe/search?${params}`);
      const data: SearchResponse = response.data;
      
      if (append) {
        setImages(prev => {
          const existingIds = new Set(prev.map(img => img.id));
          const newImages = data.search_results.filter(img => !existingIds.has(img.id));
          return [...prev, ...newImages];
        });
      } else {
        setImages(data.search_results);
      }
      
      setPagination({
        total_count: data.pagination.total_count,
        current_page: page,
        limit: data.pagination.limit,
        has_more: data.pagination.has_more
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search images');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // No dependencies needed now

  // Load initial images on mount
  useEffect(() => {
    searchImages({});
  }, [searchImages]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !pagination.has_more || loading) return;

      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user is within 1000px of the bottom
      if (scrollTop + windowHeight >= documentHeight - 1000) {
        searchImages(searchFilters, pagination.current_page + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchImages, searchFilters, pagination, loadingMore, loading]);

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    searchImages(filters, 1);
  };

  const handleImageSelect = (image: AdobeStockImage) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      // Check if we're in a secure context
      if (!window.isSecureContext) {
        throw new Error('Secure context required');
      }

      await navigator.clipboard.writeText(text);
      setToast({ message: `${label} copied to clipboard!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Clipboard error:', err);
      
      // Fallback to legacy method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setToast({ message: `${label} copied to clipboard!`, type: 'success' });
          setTimeout(() => setToast(null), 3000);
        } else {
          throw new Error('Legacy copy method failed');
        }
      } catch (fallbackErr) {
        console.error('Fallback copy error:', fallbackErr);
        
        // Show helpful error message with the URL so user can copy manually
        const errorMessage = `Failed to copy ${label}. URL: ${text}`;
        setToast({ message: errorMessage, type: 'error' });
        setTimeout(() => setToast(null), 8000); // Longer timeout for manual copy
        
        // Also log to console for easy copying
        console.log(`Copy this ${label}:`, text);
      }
    }
  }, []);

  return (
    <TokenGate>
      <div className="min-h-screen bg-gray-50">
        {/* Search Filters */}
        <SearchFilters 
          onSearch={handleSearch} 
          loading={loading} 
          resultCount={!loading && pagination.total_count > 0 ? {
            current: Math.min(pagination.current_page * pagination.limit, pagination.total_count),
            total: pagination.total_count,
            currentPage: pagination.current_page,
            limit: pagination.limit
          } : undefined}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Searching images...</span>
          </div>
        )}

        {/* Image Grid */}
        {!loading && images.length > 0 && (
          <>
            <ImageGrid 
              images={images} 
              onImageSelect={handleImageSelect}
              onCopyUrl={copyToClipboard}
            />
            
            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading more images...</span>
              </div>
            )}
            
            {/* End of Results Indicator */}
            {!pagination.has_more && images.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">You&apos;ve reached the end of the results</p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && images.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No images found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal 
          image={selectedImage} 
          onClose={handleCloseModal}
          onCopyUrl={copyToClipboard}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </TokenGate>
  );
}
