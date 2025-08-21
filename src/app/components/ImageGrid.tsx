'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useMasonryColumns, getResponsiveGap } from '../../hooks/useMasonryLayout';

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
  const [containerWidth, setContainerWidth] = useState(1200);
  
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const updateWidth = () => {
        const newWidth = node.offsetWidth;
        console.log('ImageGrid container width updated:', newWidth);
        setContainerWidth(newWidth);
      };
      updateWidth();
      
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(node);
      
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Filter out .ai files and non-photo files, and add default dimensions
  const filteredImages = useMemo(() => {
    return images.filter(image => {
      const imageUrl = image.s3_url || image.comp_url || image.thumbnail_url;
      if (!imageUrl) return false;
      
      // Check for .ai extension
      if (imageUrl.toLowerCase().includes('.ai')) return false;
      
      // Check for common photo file extensions
      const photoExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const hasPhotoExtension = photoExtensions.some(ext => 
        imageUrl.toLowerCase().includes(ext)
      );
      
      // If no photo extension found, check title for photo-related terms
      if (!hasPhotoExtension) {
        const title = image.title?.toLowerCase() || '';
        const isPhotoContent = title.includes('photo') || 
                              title.includes('image') || 
                              title.includes('picture') ||
                              !title.includes('vector') &&
                              !title.includes('illustration') &&
                              !title.includes('graphic') &&
                              !title.includes('design');
        return isPhotoContent;
      }
      
      return true;
    }).map(image => ({
      ...image,
      // Provide varied default dimensions if not available to create different aspect ratios
      width: image.width || (300 + (image.id % 4) * 100), // 300, 400, 500, 600
      height: image.height || (200 + (image.id % 3) * 100) // 200, 300, 400
    }));
  }, [images]);

  // Calculate responsive gap
  const gap = getResponsiveGap(containerWidth);
  
  // Calculate masonry columns
  const { columns, columnWidth, columnCount } = useMasonryColumns(filteredImages, {
    containerWidth,
    gap
  });
  
  // Debug logging
  console.log('ImageGrid Masonry:', {
    containerWidth,
    gap,
    columnCount,
    columnWidth: Math.round(columnWidth),
    imageCount: filteredImages.length,
    columnsWithImages: columns.map(col => col.images.length),
    firstColumnFirstImageHeight: columns[0]?.images[0]?.calculatedHeight
  });

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
    // To: https://ik.imagekit.io/9ry3lupe5/licensed-adobe-assets/filename.jpg
    
    try {
      if (url && url.includes('licensed-adobe-assets.s3.amazonaws.com/adobe-stock-images/')) {
        const filename = url.split('/').pop();
        if (filename) {
          return `https://ik.imagekit.io/9ry3lupe5/licensed-adobe-assets/${filename}`;
        }
      }
    } catch (error) {
      console.error('Error converting to ImageKit URL:', error, 'Original URL:', url);
    }
    
    // If it's not an S3 URL or conversion failed, return as is
    return url;
  }, []);



  // Memoize image handlers per image ID to prevent recreation
  const imageHandlers = useMemo(() => {
    const handlers: Record<number, {
      onLoadStart: () => void;
      onLoad: () => void;
      onError: () => void;
    }> = {};
    
    filteredImages.forEach(image => {
      handlers[image.id] = {
        onLoadStart: () => handleImageLoadStart(image.id),
        onLoad: () => handleImageLoad(image.id),
        onError: () => handleImageError(image.id),
      };
    });
    
    return handlers;
  }, [filteredImages, handleImageLoad, handleImageError, handleImageLoadStart]);

  return (
    <div 
      ref={containerRef} 
      className="flex w-full items-start"
      style={{ gap: `${gap}px` }}
    >
      {columns.map((column) => (
        <div
          key={column.columnIndex}
          className="flex flex-col"
          style={{ 
            width: `${columnWidth}px`,
            gap: `${gap}px`
          }}
        >
          {column.images.map((image) => {
            const handlers = imageHandlers[image.id];
            
            return (
              <div
                key={image.id}
                className="group bg-white overflow-hidden cursor-pointer rounded-lg shadow-sm hover:shadow-md transition-all duration-300 relative"
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
                {loadingImages.has(image.id) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                <Image
                  src={getImageUrl(image)}
                  alt={image.title || `Adobe Stock Image ${image.id}`}
                  width={columnWidth}
                  height={image.calculatedHeight}
                  className="w-full h-auto rounded-lg block"
                  onLoadStart={handlers.onLoadStart}
                  onLoad={handlers.onLoad}
                  onError={handlers.onError}
                  sizes={`${columnWidth}px`}
                />

                {/* Overlay with Quick Actions */}
                {hoveredImage === image.id && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-2 rounded-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const imageUrl = getImageUrl(image);
                          const imageKitUrl = convertToImageKitUrl(imageUrl);
                          console.log('Hover action - Original URL:', imageUrl);
                          console.log('Hover action - ImageKit URL:', imageKitUrl);
                          onCopyUrl(imageKitUrl, 'ImageKit URL');
                        }}
                        className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
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
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
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
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                        title="View Details"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
} 