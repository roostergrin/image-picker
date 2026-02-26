'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { parseJsonForImages, updateImageSlot, getImageKitUrl, getSlotDisplayName } from './utils';
import { ParsedJson, ParsedSection, ImageSlot, ImageAgentResult, ImageAgentResponse } from './types';
import { apiClient, setInMemoryInternalApiKey } from '@/services/apiService';
import { safeGetItem, safeRemoveItem } from '@/utils/safeStorage';

// Token gate component (matches pattern from content-test page)
const TokenGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setChecking(true);
      
      // Check localStorage for saved token
      const savedToken = safeGetItem('INTERNAL_API_TOKEN') || safeGetItem('internalApiToken');
      
      if (!savedToken) {
        // No token found, redirect to main auth page
        window.location.href = '/';
        return;
      }
      
      // Try to verify the saved token
      try {
        setInMemoryInternalApiKey(savedToken);
        const response = await apiClient.get('/api/health');
        
        if (response && response.status === 200) {
          setVerified(true);
        } else {
          throw new Error('Health check failed');
        }
      } catch {
        // Token is invalid, clear it and redirect to main auth page
        setInMemoryInternalApiKey(null);
        safeRemoveItem('INTERNAL_API_TOKEN');
        safeRemoveItem('internalApiToken');
        window.location.href = '/';
        return;
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (verified) return <>{children}</>;

  // This shouldn't be reached due to redirects, but just in case
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <p className="text-gray-600">Redirecting to authentication...</p>
      </div>
    </div>
  );
};

// Image result card component
const ImageResultCard: React.FC<{
  image: ImageAgentResult;
  onSelect: (image: ImageAgentResult) => void;
  isLicensed?: boolean;
}> = ({ image, onSelect, isLicensed }) => (
  <div
    className="relative border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
    onClick={() => onSelect(image)}
  >
    <img
      src={image.thumbnail_url || image.comp_url}
      alt={image.title}
      className="w-full h-32 object-cover"
    />
    <div className="absolute top-2 right-2 flex gap-1">
      {isLicensed && (
        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
          Licensed
        </span>
      )}
      {image.adobe_also_selected && (
        <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded">
          ⭐ Adobe Pick
        </span>
      )}
    </div>
    <div className="p-2">
      <p className="text-xs text-gray-600 truncate">{image.title}</p>
    </div>
  </div>
);

// Image agent modal component
const ImageAgentModal: React.FC<{
  slot: ImageSlot;
  onClose: () => void;
  onSelect: (slot: ImageSlot, image: ImageAgentResult) => void;
}> = ({ slot, onClose, onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImageAgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build search context from slot data
      const searchTitle = slot.sectionTitle || 'Image';
      const searchCategory = slot.contextCategory || 'general';
      
      // Determine image type from layout
      const layoutLower = (slot.sectionLayout || '').toLowerCase();
      let imageType = 'general';
      if (layoutLower.includes('hero')) imageType = 'hero';
      else if (layoutLower.includes('thumbnail')) imageType = 'thumbnail';
      else if (layoutLower.includes('background')) imageType = 'background';
      
      // Use section description if available
      const searchBody = slot.sectionDescription || '';

      const requestBody = {
        title: searchTitle,
        body: searchBody,
        category: searchCategory,
        keywords: [],
        image_type: imageType,
        licensed_limit: 15,
        catalog_limit: 10,
        use_agent_reasoning: true,
        raw_section_data: slot.rawSectionData
      };

      const response = await apiClient.post('/api/image-agent', requestBody);

      setResults(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search images');
    } finally {
      setLoading(false);
    }
  }, [slot]);

  // Auto-search on mount
  useEffect(() => {
    searchImages();
  }, [searchImages]);

  const handleSelect = (image: ImageAgentResult) => {
    onSelect(slot, image);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Find Image</h2>
              <p className="text-sm text-gray-600 mt-1">
                {getSlotDisplayName(slot)}
                {slot.contextCategory && (
                  <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {slot.contextCategory}
                  </span>
                )}
              </p>
              {slot.sectionDescription && (
                <p className="text-xs text-gray-500 mt-1 max-w-lg line-clamp-2">
                  Description: {slot.sectionDescription}
                </p>
              )}
              {slot.alt && (
                <p className="text-xs text-gray-400 mt-1 max-w-lg truncate">
                  Alt: {slot.alt}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Searching images...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              {error}
              <button
                onClick={searchImages}
                className="ml-4 text-red-600 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {results?.results && (
            <div className="space-y-6">
              {/* Licensed Results */}
              {results.results.licensed_results.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                      ✓ Licensed ({results.results.licensed_results.length})
                    </span>
                    <span className="text-xs text-gray-500">Already owned - no additional cost</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {results.results.licensed_results.map(img => (
                      <ImageResultCard
                        key={img.id}
                        image={img}
                        onSelect={handleSelect}
                        isLicensed
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Catalog Results */}
              {results.results.catalog_results.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                      🔍 Catalog ({results.results.catalog_results.length})
                    </span>
                    <span className="text-xs text-gray-500">Would need to license</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {results.results.catalog_results.map(img => (
                      <ImageResultCard
                        key={img.id}
                        image={img}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {results.results.licensed_results.length === 0 && 
               results.results.catalog_results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No images found. Try a different search.
                </div>
              )}

              {/* Stats */}
              {results.results.overlap_count > 0 && (
                <p className="text-xs text-purple-600 text-center">
                  ⭐ {results.results.overlap_count} licensed images were also selected by Adobe&apos;s algorithm
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// URL format validation helpers
const isSrcFormatValid = (src: string): boolean => {
  if (!src) return true;
  // src should NOT end with .webp
  return !src.toLowerCase().endsWith('.webp');
};

const isWebpFormatValid = (webp: string): boolean => {
  if (!webp) return true;
  const lower = webp.toLowerCase();
  // webp MUST end with .webp OR be an ImageKit URL with f-webp transformation
  return lower.endsWith('.webp') || (lower.includes('imagekit.io') && lower.includes('f-webp'));
};

// Copyable URL component
const CopyableUrl: React.FC<{
  label: string;
  url: string;
  isValid: boolean;
  validationMessage?: string;
}> = ({ label, url, isValid, validationMessage }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={`flex items-start gap-2 p-2 rounded text-xs ${
      isValid ? 'bg-gray-50' : 'bg-red-50 border border-red-300'
    }`}>
      <span className={`font-semibold shrink-0 ${isValid ? 'text-gray-600' : 'text-red-600'}`}>
        {label}:
      </span>
      <div className="flex-1 min-w-0">
        <code 
          className={`break-all cursor-pointer hover:bg-gray-200 px-1 rounded ${
            isValid ? 'text-gray-700' : 'text-red-700'
          }`}
          onClick={handleCopy}
          title="Click to copy"
        >
          {url}
        </code>
        {!isValid && validationMessage && (
          <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {validationMessage}</p>
        )}
      </div>
      <button
        onClick={handleCopy}
        className={`shrink-0 px-2 py-0.5 rounded text-xs transition-colors ${
          copied 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
};

// Helper to extract image ID from URL (looks for Adobe Stock ID pattern)
const extractImageIdFromUrl = (url: string): number | null => {
  // Match patterns like /123456789_ or /123456789.jpg
  const match = url.match(/\/(\d{6,12})[_\.]/);
  return match ? parseInt(match[1], 10) : null;
};

// Inline image search results component
const InlineImageResults: React.FC<{
  slot: ImageSlot;
  onSelect: (image: ImageAgentResult) => void;
  onClose: () => void;
  excludedImageIds: number[];
  selectedImageId: number | null;
  usedImageIds: Set<number>;
}> = ({ slot, onSelect, onClose, excludedImageIds, selectedImageId, usedImageIds }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ImageAgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to capture initial excludedImageIds - don't re-search when it changes
  const initialExcludedIds = useRef(excludedImageIds);

  const searchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchTitle = slot.sectionTitle || 'Image';
      const searchCategory = slot.contextCategory || 'general';
      
      const layoutLower = (slot.sectionLayout || '').toLowerCase();
      let imageType = 'general';
      if (layoutLower.includes('hero')) imageType = 'hero';
      else if (layoutLower.includes('thumbnail')) imageType = 'thumbnail';
      else if (layoutLower.includes('background')) imageType = 'background';
      
      const searchBody = slot.sectionDescription || '';

      const requestBody = {
        title: searchTitle,
        body: searchBody,
        category: searchCategory,
        keywords: [],
        image_type: imageType,
        licensed_limit: 15,
        catalog_limit: 10,
        use_agent_reasoning: true,
        raw_section_data: slot.rawSectionData,
        exclude_ids: initialExcludedIds.current
      };

      const response = await apiClient.post('/api/image-agent', requestBody);
      setResults(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search images');
    } finally {
      setLoading(false);
    }
  }, [slot]);

  // Only search once on mount - don't re-search when props change
  useEffect(() => {
    searchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Search Results</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Searching...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
          <button
            onClick={searchImages}
            className="ml-3 text-red-600 underline hover:no-underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {results?.results && (
        <div className="space-y-4">
          {/* Licensed Results */}
          {results.results.licensed_results.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                  ✓ Licensed ({results.results.licensed_results.length})
                </span>
                <span className="text-xs text-gray-500">Already owned</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {results.results.licensed_results.map(img => {
                  const isDuplicate = usedImageIds.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`relative cursor-pointer rounded overflow-hidden transition-all ${
                        selectedImageId === img.id 
                          ? 'ring-4 ring-green-500 ring-offset-2' 
                          : isDuplicate
                            ? 'ring-2 ring-purple-400'
                            : 'hover:ring-2 hover:ring-blue-500'
                      }`}
                      onClick={() => onSelect(img)}
                      title={img.title}
                    >
                      <img
                        src={img.thumbnail_url || img.comp_url}
                        alt={img.title}
                        className="w-full h-28 object-cover"
                      />
                      {selectedImageId === img.id && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                            ✓ Selected
                          </span>
                        </div>
                      )}
                      {isDuplicate && selectedImageId !== img.id && (
                        <span className="absolute bottom-1 left-1 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                          🔁 In Use
                        </span>
                      )}
                      {img.adobe_also_selected && selectedImageId !== img.id && !isDuplicate && (
                        <span className="absolute top-1 right-1 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                          ⭐
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Catalog Results */}
          {results.results.catalog_results.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                  🔍 Catalog ({results.results.catalog_results.length})
                </span>
                <span className="text-xs text-gray-500">Needs license</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {results.results.catalog_results.map(img => {
                  const isDuplicate = usedImageIds.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`relative cursor-pointer rounded overflow-hidden transition-all ${
                        selectedImageId === img.id 
                          ? 'ring-4 ring-green-500 ring-offset-2' 
                          : isDuplicate
                            ? 'ring-2 ring-purple-400'
                            : 'hover:ring-2 hover:ring-blue-500'
                      }`}
                      onClick={() => onSelect(img)}
                      title={img.title}
                    >
                      <img
                        src={img.thumbnail_url || img.comp_url}
                        alt={img.title}
                        className="w-full h-28 object-cover"
                      />
                      {selectedImageId === img.id && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                            ✓ Selected
                          </span>
                        </div>
                      )}
                      {isDuplicate && selectedImageId !== img.id && (
                        <span className="absolute bottom-1 left-1 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                          🔁 In Use
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.results.licensed_results.length === 0 && 
           results.results.catalog_results.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-4">
              No images found.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Image slot with preview component
const ImageSlotPreview: React.FC<{
  slot: ImageSlot;
  onSelectImage: (slot: ImageSlot, image: ImageAgentResult) => void;
  onFixSrcWebp: (slot: ImageSlot) => void;
  onToggleSelection: (slotId: string, shiftKey: boolean) => void;
  duplicateUrls: Set<string>;
  excludedImageIds: number[];
  usedImageIds: Set<number>;
  isSelected: boolean;
  bulkSearchResult: ImageAgentResponse | null;
  isBulkLoading: boolean;
}> = ({ slot, onSelectImage, onFixSrcWebp, onToggleSelection, duplicateUrls, excludedImageIds, usedImageIds, isSelected, bulkSearchResult, isBulkLoading }) => {
  const [imgError, setImgError] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  
  const srcValid = isSrcFormatValid(slot.src);
  const webpValid = isWebpFormatValid(slot.webp);
  const hasFormatIssue = !srcValid || !webpValid;
  
  // Check for duplicates
  const srcIsDuplicate = slot.src && duplicateUrls.has(slot.src);
  const webpIsDuplicate = slot.webp && duplicateUrls.has(slot.webp);
  const hasDuplicate = srcIsDuplicate || webpIsDuplicate;

  // Show bulk results if available and not manually searching
  const showBulkResults = !showSearch && bulkSearchResult?.results && isSelected;

  const handleSelectImage = (image: ImageAgentResult) => {
    onSelectImage(slot, image);
    setSelectedImageId(image.id);
    // Don't close search - keep it open so user can see selected image and choose different ones
  };

  // Handle checkbox click with shift key for range selection
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection(slot.id, e.shiftKey);
  };

  // Determine background color based on issues
  const getBgClass = () => {
    if (!isSelected) return 'bg-gray-100 border-gray-300 opacity-60';
    if (slot.preserveImage) return 'bg-cyan-50 border-cyan-300';
    if (slot.needsImage) return 'bg-red-50 border-red-200';
    if (hasFormatIssue && hasDuplicate) return 'bg-red-50 border-red-300';
    if (hasFormatIssue) return 'bg-orange-50 border-orange-300';
    if (hasDuplicate) return 'bg-purple-50 border-purple-300';
    return 'bg-green-50 border-green-200';
  };

  return (
    <div className={`p-3 rounded border ${getBgClass()}`}>
      {isBulkLoading && (
        <div className="mb-2 flex items-center gap-2 text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Searching...</span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Checkbox for bulk selection */}
        <div 
          className="shrink-0 flex items-start pt-1 cursor-pointer"
          onClick={handleCheckboxClick}
          title="Click to toggle, Shift+click for range selection"
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-white border-gray-300 hover:border-gray-400'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        {/* Image thumbnail */}
        <div className="shrink-0">
          {!slot.needsImage && !imgError && slot.src ? (
            <img
              src={slot.src}
              alt={slot.alt || 'Preview'}
              className={`w-24 h-24 object-cover rounded border bg-white ${!isSelected ? 'grayscale' : ''}`}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded border flex items-center justify-center text-gray-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info and URLs */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-lg ${
                slot.preserveImage ? 'text-cyan-500' :
                slot.needsImage ? 'text-red-500' :
                hasFormatIssue || hasDuplicate ? 'text-orange-500' : 'text-green-500'
              }`}>
                {slot.preserveImage ? '🔒' : slot.needsImage ? '✗' : hasFormatIssue || hasDuplicate ? '⚠️' : '✓'}
              </span>
              <span className="text-sm font-medium">
                {getSlotDisplayName(slot)}
              </span>
              {slot.preserveImage && (
                <span className="bg-cyan-200 text-cyan-800 px-2 py-0.5 rounded text-xs font-medium">
                  Preserved - Keep Current Image
                </span>
              )}
              {slot.needsImage && !slot.preserveImage && (
                <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded text-xs font-medium">
                  Needs Image
                </span>
              )}
              {hasFormatIssue && !slot.needsImage && !slot.preserveImage && (
                <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded text-xs font-medium">
                  Format Issue
                </span>
              )}
              {hasDuplicate && !slot.needsImage && !slot.preserveImage && (
                <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                  Duplicate
                </span>
              )}
            </div>
            {!slot.preserveImage && (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  showSearch
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {showSearch ? 'Hide Search' : 'Find Image'}
              </button>
            )}
          </div>

          {/* URLs - only show if has image */}
          {!slot.needsImage && (
            <div className="space-y-1">
              {slot.src && (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CopyableUrl
                      label="SRC"
                      url={slot.src}
                      isValid={srcValid && !srcIsDuplicate}
                      validationMessage={
                        !srcValid 
                          ? "SRC should not end with .webp" 
                          : srcIsDuplicate 
                            ? "Duplicate URL - used elsewhere" 
                            : undefined
                      }
                    />
                  </div>
                  {!srcValid && slot.src.toLowerCase().endsWith('.webp') && (
                    <button
                      onClick={() => onFixSrcWebp(slot)}
                      className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium"
                      title="Remove .webp from end of URL"
                    >
                      Fix .webp
                    </button>
                  )}
                </div>
              )}
              {slot.webp && (
                <CopyableUrl
                  label="WEBP"
                  url={slot.webp}
                  isValid={webpValid && !webpIsDuplicate}
                  validationMessage={
                    !webpValid 
                      ? "WEBP must end with .webp" 
                      : webpIsDuplicate 
                        ? "Duplicate URL - used elsewhere" 
                        : undefined
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline Search Results (manual search) */}
      {showSearch && (
        <InlineImageResults
          slot={slot}
          onSelect={handleSelectImage}
          onClose={() => {
            setShowSearch(false);
            setSelectedImageId(null);
          }}
          excludedImageIds={excludedImageIds}
          selectedImageId={selectedImageId}
          usedImageIds={usedImageIds}
        />
      )}

      {/* Bulk Search Results */}
      {showBulkResults && isSelected && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Search Results (Bulk)</h4>
          </div>
          <div className="space-y-4">
            {/* Licensed Results */}
            {bulkSearchResult.results!.licensed_results.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                    ✓ Licensed ({bulkSearchResult.results!.licensed_results.length})
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {bulkSearchResult.results!.licensed_results.map(img => {
                    const isDuplicate = usedImageIds.has(img.id);
                    return (
                      <div
                        key={img.id}
                        className={`relative cursor-pointer rounded overflow-hidden transition-all ${
                          selectedImageId === img.id 
                            ? 'ring-4 ring-green-500 ring-offset-2' 
                            : isDuplicate
                              ? 'ring-2 ring-purple-400'
                              : 'hover:ring-2 hover:ring-blue-500'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleSelectImage(img); }}
                        title={img.title}
                      >
                        <img
                          src={img.thumbnail_url || img.comp_url}
                          alt={img.title}
                          className="w-full h-28 object-cover"
                        />
                        {selectedImageId === img.id && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                              ✓ Selected
                            </span>
                          </div>
                        )}
                        {isDuplicate && selectedImageId !== img.id && (
                          <span className="absolute bottom-1 left-1 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            🔁 In Use
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catalog Results */}
            {bulkSearchResult.results!.catalog_results.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                    🔍 Catalog ({bulkSearchResult.results!.catalog_results.length})
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {bulkSearchResult.results!.catalog_results.map(img => {
                    const isDuplicate = usedImageIds.has(img.id);
                    return (
                      <div
                        key={img.id}
                        className={`relative cursor-pointer rounded overflow-hidden transition-all ${
                          selectedImageId === img.id 
                            ? 'ring-4 ring-green-500 ring-offset-2' 
                            : isDuplicate
                              ? 'ring-2 ring-purple-400'
                              : 'hover:ring-2 hover:ring-blue-500'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleSelectImage(img); }}
                        title={img.title}
                      >
                        <img
                          src={img.thumbnail_url || img.comp_url}
                          alt={img.title}
                          className="w-full h-28 object-cover"
                        />
                        {selectedImageId === img.id && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                              ✓ Selected
                            </span>
                          </div>
                        )}
                        {isDuplicate && selectedImageId !== img.id && (
                          <span className="absolute bottom-1 left-1 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            🔁 In Use
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {bulkSearchResult.results!.licensed_results.length === 0 && 
             bulkSearchResult.results!.catalog_results.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No images found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Section card component
const SectionCard: React.FC<{
  section: ParsedSection;
  onSelectImage: (slot: ImageSlot, image: ImageAgentResult) => void;
  onFixSrcWebp: (slot: ImageSlot) => void;
  onToggleSelection: (slotId: string, shiftKey: boolean) => void;
  duplicateUrls: Set<string>;
  excludedImageIds: number[];
  usedImageIds: Set<number>;
  selectedSlots: Set<string>;
  bulkSearchResults: Map<string, ImageAgentResponse>;
  bulkSearchLoading: Set<string>;
}> = ({ section, onSelectImage, onFixSrcWebp, onToggleSelection, duplicateUrls, excludedImageIds, usedImageIds, selectedSlots, bulkSearchResults, bulkSearchLoading }) => {
  const hasImages = section.imageSlots.length > 0;
  
  // Count format issues
  const formatIssues = section.imageSlots.filter(slot =>
    !slot.needsImage && !slot.preserveImage && (!isSrcFormatValid(slot.src) || !isWebpFormatValid(slot.webp))
  ).length;

  // Count duplicates in this section
  const duplicateCount = section.imageSlots.filter(slot =>
    !slot.needsImage && !slot.preserveImage && (
      (slot.src && duplicateUrls.has(slot.src)) ||
      (slot.webp && duplicateUrls.has(slot.webp))
    )
  ).length;

  // Count preserved images in this section
  const preservedCount = section.imageSlots.filter(slot => slot.preserveImage).length;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono">
              {section.layoutType}
            </span>
            {section.title && (
              <h3 className="font-medium text-gray-900">{section.title}</h3>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Section {section.sectionIndex + 1} on {section.pageName}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {preservedCount > 0 && (
            <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded text-xs">
              🔒 {preservedCount} preserved
            </span>
          )}
          {section.imagesHave > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
              ✓ {section.imagesHave}
            </span>
          )}
          {section.imagesNeeded > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
              ✗ {section.imagesNeeded} needed
            </span>
          )}
          {formatIssues > 0 && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
              ⚠️ {formatIssues} format
            </span>
          )}
          {duplicateCount > 0 && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
              🔁 {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {hasImages && (
        <div className="space-y-3">
          {section.imageSlots.map((slot: ImageSlot) => (
            <ImageSlotPreview
              key={slot.id}
              slot={slot}
              onSelectImage={onSelectImage}
              onFixSrcWebp={onFixSrcWebp}
              onToggleSelection={onToggleSelection}
              duplicateUrls={duplicateUrls}
              excludedImageIds={excludedImageIds}
              usedImageIds={usedImageIds}
              isSelected={selectedSlots.has(slot.id)}
              bulkSearchResult={bulkSearchResults.get(slot.id) || null}
              isBulkLoading={bulkSearchLoading.has(slot.id)}
            />
          ))}
        </div>
      )}

      {!hasImages && (
        <p className="text-sm text-gray-500">No image slots in this section</p>
      )}
    </div>
  );
};

// Main page component
export default function JsonAnalyzerPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedJson, setParsedJson] = useState<ParsedJson | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [updatedJson, setUpdatedJson] = useState<Record<string, unknown> | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [excludedImageIds, setExcludedImageIds] = useState<number[]>([]);
  
  // Bulk search state
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [bulkSearchResults, setBulkSearchResults] = useState<Map<string, ImageAgentResponse>>(new Map());
  const [bulkSearchLoading, setBulkSearchLoading] = useState<Set<string>>(new Set());
  const [bulkSearchProgress, setBulkSearchProgress] = useState<{ current: number; total: number } | null>(null);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const lastClickedSlotRef = useRef<string | null>(null);

  // Compute duplicate URLs across all image slots
  const duplicateUrls = useMemo(() => {
    if (!parsedJson) return new Set<string>();
    
    const urlCounts = new Map<string, number>();
    
    // Count all URLs
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (!slot.needsImage) {
            if (slot.src) {
              urlCounts.set(slot.src, (urlCounts.get(slot.src) || 0) + 1);
            }
            if (slot.webp) {
              urlCounts.set(slot.webp, (urlCounts.get(slot.webp) || 0) + 1);
            }
          }
        }
      }
    }
    
    // Return set of URLs that appear more than once
    const duplicates = new Set<string>();
    for (const [url, count] of urlCounts) {
      if (count > 1) {
        duplicates.add(url);
      }
    }
    return duplicates;
  }, [parsedJson]);

  // Count total duplicates for summary
  const totalDuplicates = useMemo(() => {
    if (!parsedJson) return 0;
    let count = 0;
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (!slot.needsImage && (
            (slot.src && duplicateUrls.has(slot.src)) ||
            (slot.webp && duplicateUrls.has(slot.webp))
          )) {
            count++;
          }
        }
      }
    }
    return count;
  }, [parsedJson, duplicateUrls]);

  // Extract all used image IDs from current URLs
  const usedImageIds = useMemo(() => {
    if (!parsedJson) return new Set<number>();
    
    const ids = new Set<number>();
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (!slot.needsImage && slot.src) {
            const id = extractImageIdFromUrl(slot.src);
            if (id) ids.add(id);
          }
        }
      }
    }
    return ids;
  }, [parsedJson]);

  const handleParse = useCallback(() => {
    setParseError(null);
    setParsedJson(null);
    setUpdatedJson(null);

    try {
      const json = JSON.parse(jsonInput);
      const parsed = parseJsonForImages(json);
      setParsedJson(parsed);
      setUpdatedJson(json);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, [jsonInput]);

  const handleSelectImage = (slot: ImageSlot, image: ImageAgentResult) => {
    if (!updatedJson) return;

    // Get ImageKit URLs from the filename
    const filename = image.filename || image.s3_url?.split('/').pop() || `${image.id}.jpg`;
    const { src, webp } = getImageKitUrl(filename);

    // Update the JSON
    const newJson = updateImageSlot(updatedJson, slot.path, src, webp);
    setUpdatedJson(newJson);

    // Add image ID to exclusions so it won't show up in future searches
    setExcludedImageIds(prev => [...prev, image.id]);

    // Re-parse to update UI
    const reParsed = parseJsonForImages(newJson);
    setParsedJson(reParsed);
  };

  const handleFixSrcWebp = (slot: ImageSlot) => {
    if (!updatedJson || !slot.src) return;

    // Remove .webp from end of src URL (e.g., "image.jpg.webp" -> "image.jpg")
    const fixedSrc = slot.src.replace(/\.webp$/i, '');
    
    // Update the JSON with the fixed src (keep webp as is)
    const newJson = updateImageSlot(updatedJson, slot.path, fixedSrc, slot.webp || fixedSrc + '.webp');
    setUpdatedJson(newJson);

    // Re-parse to update UI
    const reParsed = parseJsonForImages(newJson);
    setParsedJson(reParsed);
  };

  // Fix ALL .webp issues in src URLs at once
  const handleFixAllWebp = () => {
    if (!updatedJson || !parsedJson) return;

    let newJson = updatedJson;
    let fixCount = 0;

    // Go through all pages and sections to find src URLs ending in .webp
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (slot.src && slot.src.toLowerCase().endsWith('.webp')) {
            const fixedSrc = slot.src.replace(/\.webp$/i, '');
            newJson = updateImageSlot(newJson, slot.path, fixedSrc, slot.webp || fixedSrc + '.webp');
            fixCount++;
          }
        }
      }
    }

    if (fixCount > 0) {
      setUpdatedJson(newJson);
      const reParsed = parseJsonForImages(newJson);
      setParsedJson(reParsed);
    }
  };

  // Count how many src URLs have .webp issue
  const webpIssueCount = useMemo(() => {
    if (!parsedJson) return 0;
    let count = 0;
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (slot.src && slot.src.toLowerCase().endsWith('.webp')) {
            count++;
          }
        }
      }
    }
    return count;
  }, [parsedJson]);

  // Get ordered list of all slot IDs
  const allSlotIds = useMemo(() => {
    if (!parsedJson) return [];
    const ids: string[] = [];
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          ids.push(slot.id);
        }
      }
    }
    return ids;
  }, [parsedJson]);

  // Get list of slot IDs that are NOT preserved (should be selected by default)
  const selectableSlotIds = useMemo(() => {
    if (!parsedJson) return [];
    const ids: string[] = [];
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (!slot.preserveImage) {
            ids.push(slot.id);
          }
        }
      }
    }
    return ids;
  }, [parsedJson]);

  // Count of preserved slots
  const preservedCount = useMemo(() => {
    return allSlotIds.length - selectableSlotIds.length;
  }, [allSlotIds, selectableSlotIds]);

  // Initialize non-preserved slots as selected when JSON is parsed
  useEffect(() => {
    if (selectableSlotIds.length > 0) {
      setSelectedSlots(new Set(selectableSlotIds));
    }
  }, [selectableSlotIds]);

  // Toggle selection for a slot with shift+click support for range selection
  const handleToggleSelection = (slotId: string, shiftKey: boolean) => {
    if (shiftKey && lastClickedSlotRef.current && lastClickedSlotRef.current !== slotId) {
      // Shift+click: toggle range from last clicked to current
      const lastIndex = allSlotIds.indexOf(lastClickedSlotRef.current);
      const currentIndex = allSlotIds.indexOf(slotId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = allSlotIds.slice(start, end + 1);
        
        // Check if we should select or deselect the range
        // If the clicked item is selected, deselect the range; otherwise select it
        const shouldSelect = !selectedSlots.has(slotId);
        
        setSelectedSlots(prev => {
          const next = new Set(prev);
          for (const id of rangeIds) {
            if (shouldSelect) {
              next.add(id);
            } else {
              next.delete(id);
            }
          }
          return next;
        });
      }
    } else {
      // Regular click: toggle single item
      setSelectedSlots(prev => {
        const next = new Set(prev);
        if (next.has(slotId)) {
          next.delete(slotId);
        } else {
          next.add(slotId);
        }
        return next;
      });
    }
    lastClickedSlotRef.current = slotId;
  };

  // Get all slots that need searching (selected ones)
  const getAllSlotsForSearch = useCallback(() => {
    if (!parsedJson) return [];
    const slots: ImageSlot[] = [];
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          if (selectedSlots.has(slot.id)) {
            slots.push(slot);
          }
        }
      }
    }
    return slots;
  }, [parsedJson, selectedSlots]);

  // Search for a single slot (with extended timeout for agent calls)
  const searchForSlot = async (slot: ImageSlot, currentExclusions: number[]): Promise<ImageAgentResponse | null> => {
    try {
      const searchTitle = slot.sectionTitle || 'Image';
      const searchCategory = slot.contextCategory || 'general';
      
      const layoutLower = (slot.sectionLayout || '').toLowerCase();
      let imageType = 'general';
      if (layoutLower.includes('hero')) imageType = 'hero';
      else if (layoutLower.includes('thumbnail')) imageType = 'thumbnail';
      else if (layoutLower.includes('background')) imageType = 'background';
      
      const searchBody = slot.sectionDescription || '';

      const requestBody = {
        title: searchTitle,
        body: searchBody,
        category: searchCategory,
        keywords: [],
        image_type: imageType,
        licensed_limit: 15,
        catalog_limit: 10,
        use_agent_reasoning: true,
        raw_section_data: slot.rawSectionData,
        exclude_ids: currentExclusions
      };

      // Use 3 minute timeout for agent calls (OpenAI can take a while)
      const response = await apiClient.post('/api/image-agent', requestBody, {
        timeout: 180000 // 3 minutes
      });
      return response.data;
    } catch (err) {
      console.error(`Search failed for slot ${slot.id}:`, err);
      return null;
    }
  };

  // Bulk search all images (batch 20 at a time, all in parallel within batch)
  const handleBulkSearch = async () => {
    if (!parsedJson) return;

    const slots = getAllSlotsForSearch();
    if (slots.length === 0) return;

    // Batch size for parallel agent calls
    const BATCH_SIZE = 5;
    const results = new Map<string, ImageAgentResponse>();
    
    setBulkSearchResults(new Map());
    setBulkSearchProgress({ current: 0, total: slots.length });
    
    console.log(`🚀 Starting bulk search for ${slots.length} slots in batches of ${BATCH_SIZE}`);

    // Process in batches
    for (let i = 0; i < slots.length; i += BATCH_SIZE) {
      const batch = slots.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(slots.length / BATCH_SIZE);
      
      console.log(`📦 Batch ${batchNum}/${totalBatches}: Starting ${batch.length} parallel requests...`);
      const batchStartTime = Date.now();
      
      // Mark batch as loading
      setBulkSearchLoading(prev => {
        const next = new Set(prev);
        batch.forEach(slot => next.add(slot.id));
        return next;
      });

      // Run ALL requests in this batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(slot => searchForSlot(slot, excludedImageIds))
      );

      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      const successCount = batchResults.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`✅ Batch ${batchNum}/${totalBatches}: Completed in ${batchDuration}s (${successCount}/${batch.length} successful)`);

      // Process results
      batchResults.forEach((result, index) => {
        const slot = batch[index];
        if (result.status === 'fulfilled' && result.value) {
          results.set(slot.id, result.value);
        } else if (result.status === 'rejected') {
          console.error(`❌ Slot ${slot.id} failed:`, result.reason);
        }
      });

      // Update state after each batch
      setBulkSearchResults(new Map(results));
      setBulkSearchLoading(prev => {
        const next = new Set(prev);
        batch.forEach(slot => next.delete(slot.id));
        return next;
      });
      setBulkSearchProgress({ current: Math.min(i + BATCH_SIZE, slots.length), total: slots.length });
      
      // Small delay between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < slots.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎉 Bulk search complete! ${results.size}/${slots.length} successful`);
    setBulkSearchProgress(null);
  };

  // Auto-select best images for all slots
  const handleAutoSelect = async () => {
    if (!parsedJson || !updatedJson || bulkSearchResults.size === 0) return;

    setIsAutoSelecting(true);
    
    let currentJson = updatedJson;
    let currentExclusions = [...excludedImageIds];
    const usedIds = new Set(usedImageIds);

    // Go through all pages and sections in order
    for (const page of parsedJson.pages) {
      for (const section of page.sections) {
        for (const slot of section.imageSlots) {
          // Skip if slot is not selected or no results
          if (!selectedSlots.has(slot.id)) continue;
          
          const results = bulkSearchResults.get(slot.id);
          if (!results?.results) continue;

          // Find first available image (not already used)
          const allImages = [
            ...results.results.licensed_results,
            ...results.results.catalog_results
          ];

          const availableImage = allImages.find(img => 
            !usedIds.has(img.id) && !currentExclusions.includes(img.id)
          );

          if (availableImage) {
            // Get ImageKit URLs from the filename
            const filename = availableImage.filename || availableImage.s3_url?.split('/').pop() || `${availableImage.id}.jpg`;
            const { src, webp } = getImageKitUrl(filename);

            // Update the JSON
            currentJson = updateImageSlot(currentJson, slot.path, src, webp);
            
            // Add to exclusions
            currentExclusions.push(availableImage.id);
            usedIds.add(availableImage.id);
          }
        }
      }
    }

    // Update all state at once
    setUpdatedJson(currentJson);
    setExcludedImageIds(currentExclusions);
    
    // Re-parse to update UI
    const reParsed = parseJsonForImages(currentJson);
    setParsedJson(reParsed);
    
    setIsAutoSelecting(false);
  };

  // Count slots available for bulk search (selected ones)
  const bulkSearchableCount = useMemo(() => {
    return selectedSlots.size;
  }, [selectedSlots]);

  // Count of deselected slots
  const deselectedCount = useMemo(() => {
    return allSlotIds.length - selectedSlots.size;
  }, [allSlotIds, selectedSlots]);

  const handleCopyJson = async () => {
    if (!updatedJson) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(updatedJson, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(updatedJson, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    if (!updatedJson) return;
    
    const blob = new Blob([JSON.stringify(updatedJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pages-content-updated.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TokenGate>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">JSON Image Analyzer</h1>
                <p className="text-sm text-gray-500">
                  Paste JSON to find sections needing images
                </p>
              </div>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                ← Back to Search
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* JSON Input */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your JSON content
            </label>
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              className="w-full h-48 p-3 border rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder='{"Home": [{"acf_fc_layout": "hero", "image": {"src": "", "webp": "", "alt": "..."}}]}'
            />
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleParse}
                disabled={!jsonInput.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Analyze JSON
              </button>
              {parseError && (
                <p className="text-red-600 text-sm">{parseError}</p>
              )}
            </div>
          </div>

          {/* Results Summary */}
          {parsedJson && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{parsedJson.pages.length}</p>
                    <p className="text-xs text-gray-600">Pages</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{parsedJson.totalImages}</p>
                    <p className="text-xs text-gray-600">Total Images</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{parsedJson.totalImagesNeeded}</p>
                    <p className="text-xs text-gray-600">Needs Images</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {parsedJson.totalImages - parsedJson.totalImagesNeeded}
                    </p>
                    <p className="text-xs text-gray-600">Has Images</p>
                  </div>
                  {preservedCount > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-cyan-600">{preservedCount}</p>
                      <p className="text-xs text-gray-600">Preserved</p>
                    </div>
                  )}
                  {totalDuplicates > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{totalDuplicates}</p>
                      <p className="text-xs text-gray-600">Duplicates</p>
                    </div>
                  )}
                  {webpIssueCount > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{webpIssueCount}</p>
                      <p className="text-xs text-gray-600">.webp Issues</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {webpIssueCount > 0 && (
                    <button
                      onClick={handleFixAllWebp}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Fix All .webp ({webpIssueCount})
                    </button>
                  )}
                  <button
                    onClick={handleCopyJson}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      copySuccess 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white border hover:bg-gray-50'
                    }`}
                  >
                    {copySuccess ? '✓ Copied!' : 'Copy JSON'}
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="bg-white border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Download JSON
                  </button>
                </div>
              </div>

              {/* Bulk Search Controls */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      <strong>{bulkSearchableCount}</strong> of {allSlotIds.length} selected
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedSlots(new Set(allSlotIds))}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Select All
                      </button>
                      <span className="text-gray-400">|</span>
                      <button
                        onClick={() => setSelectedSlots(new Set())}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Deselect All
                      </button>
                    </div>
                    {bulkSearchProgress && (
                      <span className="text-sm text-blue-600">
                        Processing {bulkSearchProgress.current}/{bulkSearchProgress.total}...
                      </span>
                    )}
                    {isAutoSelecting && (
                      <span className="text-sm text-green-600 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        Auto-selecting...
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleBulkSearch}
                      disabled={bulkSearchProgress !== null || bulkSearchableCount === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {bulkSearchProgress ? 'Searching...' : `Find All Images (${bulkSearchableCount})`}
                    </button>
                    {bulkSearchResults.size > 0 && (
                      <button
                        onClick={handleAutoSelect}
                        disabled={isAutoSelecting}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        {isAutoSelecting ? 'Selecting...' : `Auto-Select Best (${bulkSearchResults.size})`}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Click checkbox to toggle, Shift+click for range selection
                </p>
              </div>
            </div>
          )}

          {/* Pages and Sections */}
          {parsedJson && (
            <div className="space-y-8">
              {parsedJson.pages.map(page => (
                <div key={page.name}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{page.name}</h2>
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                      {page.sections.length} sections
                    </span>
                    {page.totalImagesNeeded > 0 && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                        {page.totalImagesNeeded} images needed
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {page.sections.map(section => (
                      <SectionCard
                        key={`${section.pageName}-${section.sectionIndex}`}
                        section={section}
                        onSelectImage={handleSelectImage}
                        onFixSrcWebp={handleFixSrcWebp}
                        onToggleSelection={handleToggleSelection}
                        duplicateUrls={duplicateUrls}
                        excludedImageIds={excludedImageIds}
                        usedImageIds={usedImageIds}
                        selectedSlots={selectedSlots}
                        bulkSearchResults={bulkSearchResults}
                        bulkSearchLoading={bulkSearchLoading}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!parsedJson && !parseError && (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Paste your JSON above and click &quot;Analyze&quot; to get started</p>
            </div>
          )}
        </div>
      </div>
    </TokenGate>
  );
}

