'use client';

import { useState, useCallback, useMemo } from 'react';
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

interface ImageGridProps {
  images: AdobeStockImage[];
  onImageSelect: (image: AdobeStockImage) => void;
  onCopyUrl: (url: string, label: string) => void;
}

export function ImageGrid({ images, onImageSelect, onCopyUrl }: ImageGridProps) {
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());

  const handleImageLoad = useCallback((imageId: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  }, []);

  const handleImageError = useCallback((imageId: number) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  }, []);

  const handleImageLoadStart = useCallback((imageId: number) => {
    setLoadingImages(prev => new Set(prev).add(imageId));
  }, []);

  const getImageUrl = useCallback((image: AdobeStockImage) => {
    // Prefer S3 URL if available, fallback to comp_url, then thumbnail_url
    return image.s3_url || image.comp_url || image.thumbnail_url;
  }, []);

  const convertToImageKitUrl = useCallback((url: string) => {
    // Convert S3 URL to ImageKit URL
    // From: https://licensed-adobe-assets.s3.amazonaws.com/adobe-stock-images/filename.jpg
    // To: https://ik.imagekit.io/rooster/filename.jpg
    
    try {
      if (url && url.includes('licensed-adobe-assets.s3.amazonaws.com/adobe-stock-images/')) {
        const filename = url.split('/').pop();
        if (filename) {
          return `https://ik.imagekit.io/rooster/${filename}`;
        }
      }
    } catch (error) {
      console.error('Error converting to ImageKit URL:', error, 'Original URL:', url);
    }
    
    // If it's not an S3 URL or conversion failed, return as is
    return url;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }, []);

  const truncateText = useCallback((text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);

  // Memoize image handlers per image ID to prevent recreation
  const imageHandlers = useMemo(() => {
    const handlers: Record<number, {
      onLoadStart: () => void;
      onLoad: () => void;
      onError: () => void;
    }> = {};
    
    images.forEach(image => {
      handlers[image.id] = {
        onLoadStart: () => handleImageLoadStart(image.id),
        onLoad: () => handleImageLoad(image.id),
        onError: () => handleImageError(image.id),
      };
    });
    
    return handlers;
  }, [images, handleImageLoad, handleImageError, handleImageLoadStart]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {images.map((image) => {
        const handlers = imageHandlers[image.id];
        
        return (
          <div
            key={image.id}
            className="group bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md cursor-pointer"
            onMouseEnter={() => setHoveredImage(image.id)}
            onMouseLeave={() => setHoveredImage(null)}
            onClick={() => {
              const imageUrl = getImageUrl(image);
              const imageKitUrl = convertToImageKitUrl(imageUrl);
              console.log('Original URL:', imageUrl);
              console.log('ImageKit URL:', imageKitUrl);
              onCopyUrl(imageKitUrl, 'ImageKit URL');
            }}
          >
            {/* Image Container */}
            <div className="relative aspect-square bg-gray-100">
              {loadingImages.has(image.id) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              <Image
                src={getImageUrl(image)}
                alt={image.title || `Adobe Stock Image ${image.id}`}
                fill
                className="object-cover"
                onLoadStart={handlers.onLoadStart}
                onLoad={handlers.onLoad}
                onError={handlers.onError}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              />

              {/* Overlay with Quick Actions */}
              {hoveredImage === image.id && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const imageUrl = getImageUrl(image);
                      const imageKitUrl = convertToImageKitUrl(imageUrl);
                      console.log('Hover action - Original URL:', imageUrl);
                      console.log('Hover action - ImageKit URL:', imageKitUrl);
                      onCopyUrl(imageKitUrl, 'ImageKit URL');
                    }}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                    title="Copy ImageKit URL"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </button>
                  
                  {image.s3_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyUrl(image.s3_url!, 'S3 URL');
                      }}
                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                      title="Copy S3 URL"
                    >
                      <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageSelect(image);
                    }}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                    title="View Details"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* License Status Badge */}
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Licensed
                </span>
              </div>

              {/* ImageKit Available Badge */}
              {image.s3_url && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    ImageKit
                  </span>
                </div>
              )}
            </div>

            {/* Image Info */}
            <div className="p-3">
              <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2" title={image.title}>
                {truncateText(image.title, 50)}
              </h3>
              
              <div className="space-y-1 text-xs text-gray-500">
                <p>by {image.creator_name}</p>
                <p>ID: {image.id}</p>
                {image.category && (
                  <p>Category: {truncateText(image.category, 20)}</p>
                )}
                <p>Licensed: {formatDate(image.license_date)}</p>
              </div>

              {/* Keywords Preview */}
              {image.keywords && image.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {image.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                  {image.keywords.length > 3 && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      +{image.keywords.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Dimensions */}
              {(image.width || image.height) && (
                <div className="mt-2 text-xs text-gray-500">
                  {image.width} × {image.height} px
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 