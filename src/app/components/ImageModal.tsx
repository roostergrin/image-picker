'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface AdobeStockImage {
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

interface ImageModalProps {
  image: AdobeStockImage;
  onClose: () => void;
  onCopyUrl: (url: string, label: string) => void;
}

export function ImageModal({ image, onClose, onCopyUrl }: ImageModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'urls' | 'keywords'>('details');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const getImageUrl = (image: AdobeStockImage) => {
    return image.s3_url || image.comp_url || image.thumbnail_url;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const urlsToShow = [
    { label: 'Main Image URL', url: getImageUrl(image), description: 'Best available image URL' },
    { label: 'Comp URL', url: image.comp_url, description: 'Adobe Stock comp/watermarked URL' },
    { label: 'Thumbnail URL', url: image.thumbnail_url, description: 'Small thumbnail URL' },
    ...(image.s3_url ? [{ label: 'S3 URL', url: image.s3_url, description: 'High-quality S3 stored image' }] : []),
    { label: 'Download URL', url: image.download_url, description: 'Adobe Stock download link' },
  ].filter(item => item.url);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {image.title}
            </h2>
            <p className="text-sm text-gray-600">
              Adobe Stock ID: {image.id} • by {image.creator_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            title="Close (Esc)"
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Image Preview */}
          <div className="flex-1 bg-gray-100 relative min-h-0">
            <Image
              src={getImageUrl(image)}
              alt={image.title || `Adobe Stock Image ${image.id}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 60vw"
              priority
            />
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l flex flex-col">
            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-1">
                {[
                  { id: 'details', label: 'Details' },
                  { id: 'urls', label: 'URLs' },
                  { id: 'keywords', label: 'Keywords' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 text-sm font-medium ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Image Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-700">Title</dt>
                        <dd className="text-gray-600">{image.title}</dd>
                      </div>
                      
                      <div>
                        <dt className="font-medium text-gray-700">Creator</dt>
                        <dd className="text-gray-600">{image.creator_name} (ID: {image.creator_id})</dd>
                      </div>
                      
                      <div>
                        <dt className="font-medium text-gray-700">Category</dt>
                        <dd className="text-gray-600">{image.category || 'Not specified'}</dd>
                      </div>
                      
                      <div>
                        <dt className="font-medium text-gray-700">License Date</dt>
                        <dd className="text-gray-600">{formatDate(image.license_date)}</dd>
                      </div>
                      
                      {(image.width || image.height) && (
                        <div>
                          <dt className="font-medium text-gray-700">Dimensions</dt>
                          <dd className="text-gray-600">{image.width} × {image.height} pixels</dd>
                        </div>
                      )}
                      
                      {image.description && (
                        <div>
                          <dt className="font-medium text-gray-700">Description</dt>
                          <dd className="text-gray-600">{image.description}</dd>
                        </div>
                      )}
                      
                      <div>
                        <dt className="font-medium text-gray-700">Last Updated</dt>
                        <dd className="text-gray-600">{formatDate(image.last_updated)}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Status Badges */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Status</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Licensed ✓
                      </span>
                      {image.s3_url && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          S3 Available
                        </span>
                      )}
                      {image.s3_key && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Stored
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'urls' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 mb-3">Available URLs</h3>
                  <div className="space-y-3">
                    {urlsToShow.map((urlInfo, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">{urlInfo.label}</h4>
                            <p className="text-xs text-gray-500">{urlInfo.description}</p>
                          </div>
                          <button
                            onClick={() => onCopyUrl(urlInfo.url, urlInfo.label)}
                            className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title={`Copy ${urlInfo.label}`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 break-all font-mono">
                          {urlInfo.url}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Copy All */}
                  <div className="border-t pt-3">
                    <button
                      onClick={() => {
                        const allUrls = urlsToShow.map(u => `${u.label}: ${u.url}`).join('\n');
                        navigator.clipboard.writeText(allUrls);
                      }}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                    >
                      Copy All URLs
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'keywords' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Keywords ({image.keywords?.length || 0})
                  </h3>
                  
                  {image.keywords && image.keywords.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {image.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            onClick={() => onCopyUrl(keyword, 'Keyword')}
                            title="Click to copy keyword"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>

                      {/* Copy Keywords */}
                      <div className="border-t pt-3 space-y-2">
                        <button
                          onClick={() => onCopyUrl(image.keywords.join(', '), 'Keywords (comma-separated)')}
                          className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                        >
                          Copy All Keywords (Comma-separated)
                        </button>
                        <button
                          onClick={() => onCopyUrl(image.keywords.join('\n'), 'Keywords (line-separated)')}
                          className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                        >
                          Copy All Keywords (Line-separated)
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <p className="text-sm">No keywords available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Use comp_url for previews, S3 URL for production
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onCopyUrl(getImageUrl(image), 'Best Image URL')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              Copy Best URL
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 