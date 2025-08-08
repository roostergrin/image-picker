'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchFilters } from './components/SearchFilters';
import { ImageGrid } from './components/ImageGrid';
import { ImageModal } from './components/ImageModal';
import { Pagination } from './components/Pagination';
import { Toast } from './components/Toast';

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

export default function Home() {
  const [images, setImages] = useState<AdobeStockImage[]>([]);
  const [loading, setLoading] = useState(false);
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

  const searchImages = useCallback(async (filters: SearchFilters, page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.keywords) params.append('keywords', filters.keywords);
      if (filters.category) params.append('category', filters.category);
      if (filters.creator) params.append('creator', filters.creator);
      if (filters.keywordMode) params.append('keywordMode', filters.keywordMode);
      
      const limit = 20; // Use static limit instead of pagination.limit
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      const response = await fetch(`${API_BASE_URL}/adobe/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      
      setImages(data.search_results);
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
    }
  }, []); // No dependencies needed now

  // Load initial images on mount
  useEffect(() => {
    searchImages({});
  }, [searchImages]);

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    searchImages(filters, 1);
  };

  const handlePageChange = (page: number) => {
    searchImages(searchFilters, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Adobe Stock Image Picker</h1>
              <p className="text-sm text-gray-600">
                Browse and select from your licensed Adobe Stock images
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Filters */}
        <div className="mb-8">
          <SearchFilters onSearch={handleSearch} loading={loading} />
        </div>

        {/* Results Summary */}
        {!loading && (
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              {pagination.total_count > 0 ? (
                <>
                  Showing {((pagination.current_page - 1) * pagination.limit) + 1} - {Math.min(pagination.current_page * pagination.limit, pagination.total_count)} of {pagination.total_count} images
                </>
              ) : (
                'No images found'
              )}
            </p>
          </div>
        )}

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
          <ImageGrid 
            images={images} 
            onImageSelect={handleImageSelect}
            onCopyUrl={copyToClipboard}
          />
        )}

        {/* Pagination */}
        {!loading && images.length > 0 && (
          <div className="mt-8">
            <Pagination
              currentPage={pagination.current_page}
              totalCount={pagination.total_count}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
            />
          </div>
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
  );
}
