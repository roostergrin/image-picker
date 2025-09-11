'use client';

import { useState, useEffect } from 'react';
import { ImageGrid } from './ImageGrid';
import { apiClient } from '../../services/apiService';
import { AdobeStockImage, SearchResponse } from '../page';

// Strategic keywords following Adobe Stock best practices (ordered by importance)
const CONTEXT_KEYWORDS: Record<string, string[]> = {
  // Home (6)
  "Home Hero": ["smiling", "dentist", "patient"],
  "What sets us apart": ["technology", "modern"],
  "Locally owned": ["family", "community"],
  "Experienced": ["professional", "expert"],
  "Kid friendly": ["children", "pediatric"],
  "Better Care": ["patient care", "relaxed"],
  
  // About (3)
  "About Hero": ["professional", "friendly", ],
  "Community": ["volunteer", "community", "helping"],
  
  // New Patients / Get Started (3)
  "New Patients Hero": ["smiling", "first visit"],
  "Initial Visit": ["consultation", "visit", "dentist"],
  "Flexible Payments": ["insurance"],
  
  // Treatments (13)
  "Treatments Hero": ["dentist", "patient", "professional", "care"],
  "All Ages": ["family", "grandparents"],
  "Kid": ["child", "young", "playful",],
  "Teen": ["teenager", "teen", "smile"],
  "Adult": ["adult", "confident"],
  "General": ["cleaning", "dental hygiene"],
  "Cleaning": ["dental hygienist", "cleaning"],
  "Restorative Treatments": ["dental restoration", "crown"],
  "Extractions": ["dentist", "procedure"],
  "Surgery": ["surgical", "dental surgery"],
  "Gentle": ["relaxed", "calm"],
  "Special Needs": ["down's syndrome"],
  "Emergency": ["dental emergency", "pain relief"],
  
  // Contact (1)
  "Contact Hero": ["phone", "smiling"],
  
  // FAQ (1)
  "FAQ Hero": ["information"]
};

interface ContextCardProps {
  contextName: string;
  globalKeywords?: string;
  onImageSelect: (image: AdobeStockImage) => void;
  onCopyUrl: (url: string, label: string) => void;
}

export function ContextCard({ contextName, globalKeywords, onImageSelect, onCopyUrl }: ContextCardProps) {
  const [images, setImages] = useState<AdobeStockImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);

  // Initialize active keywords when component mounts (default to first 2)
  useEffect(() => {
    const keywords = CONTEXT_KEYWORDS[contextName] || [];
    setActiveKeywords(keywords.slice(0, 2));
  }, [contextName]);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeKeywords.length === 0) {
          setImages([]);
          setTotalCount(0);
          return;
        }

        // Combine active keywords with global keywords
        const allKeywords = [...activeKeywords];
        if (globalKeywords && globalKeywords.trim()) {
          // Split global keywords by comma and add them
          const globalKeywordList = globalKeywords.split(',').map(k => k.trim()).filter(k => k);
          allKeywords.push(...globalKeywordList);
        }

        // Use the regular search API with combined keywords
        const params = new URLSearchParams();
        params.append('keywords', allKeywords.join(', '));
        params.append('keywordMode', 'AND'); // Use AND for more precise matching
        params.append('limit', '200'); // Get many results
        params.append('offset', '0');

        const response = await apiClient.get(`/api/adobe/search?${params}`);
        const data: SearchResponse = response.data;
        
        setImages(data.search_results || []);
        setTotalCount(data.pagination?.total_count || 0);
      } catch (err) {
        console.error(`Failed to fetch images for ${contextName}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
      } finally {
        setLoading(false);
      }
    };

    if (activeKeywords.length > 0) {
      fetchImages();
    } else {
      setImages([]);
      setTotalCount(0);
      setLoading(false);
    }
  }, [contextName, activeKeywords, globalKeywords]);

  const allKeywords = CONTEXT_KEYWORDS[contextName] || [];
  
  const toggleKeyword = (keyword: string) => {
    setActiveKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const resetKeywords = () => {
    setActiveKeywords(allKeywords);
  };

  const clearAllKeywords = () => {
    setActiveKeywords([]);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{contextName}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading recommendations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{contextName}</h3>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Error loading recommendations</h4>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const topImages = expanded ? images : images.slice(0, 6);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{contextName}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
              <span className="font-semibold text-blue-600">
                {images.length} images found
              </span>
              {totalCount > 0 && (
                <span>Total in library: {totalCount.toLocaleString()}</span>
              )}
              {globalKeywords && globalKeywords.trim() && (
                <span className="text-green-600 font-medium">
                  + Global: {globalKeywords}
                </span>
              )}
            </div>
            
            {/* Keywords */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Keywords ({activeKeywords.length}/{allKeywords.length} active):
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearAllKeywords}
                    className="text-xs text-red-600 hover:text-red-700"
                    disabled={activeKeywords.length === 0}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={resetKeywords}
                    className="text-xs text-blue-600 hover:text-blue-700"
                    disabled={activeKeywords.length === allKeywords.length}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {allKeywords.map((keyword, index) => {
                  const isActive = activeKeywords.includes(keyword);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleKeyword(keyword)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        isActive 
                          ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50' 
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                      title={isActive ? `Click to remove: ${keyword}` : `Click to add: ${keyword}`}
                    >
                      {keyword}
                      {isActive && (
                        <span className="ml-1 text-blue-600">×</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Toggle button */}
          {images.length > 6 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50"
            >
              {expanded ? 'Show Less' : `Show All ${images.length}`}
              <svg 
                className={`ml-1 h-4 w-4 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Images */}
      <div className="p-6">
        {images.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No matching images</h4>
            <p className="text-sm text-gray-500">No images found for this context&apos;s keywords</p>
          </div>
        ) : (
          <>
            <ImageGrid 
              images={topImages} 
              onImageSelect={onImageSelect}
              onCopyUrl={onCopyUrl}
            />
            
            {!expanded && images.length > 6 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setExpanded(true)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  and {images.length - 6} more images...
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image details when expanded */}
      {expanded && images.length > 0 && (
        <div className="px-6 pb-6">
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Images</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {images.slice(0, 10).map((image, index) => (
                <div key={image.id} className="flex justify-between items-center text-xs">
                  <span className="truncate flex-1 mr-2" title={image.title}>
                    {index + 1}. {image.title}
                  </span>
                  <span className="text-gray-600 whitespace-nowrap">
                    ID: {image.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}