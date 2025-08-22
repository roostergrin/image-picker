'use client';

import { useState, useCallback } from 'react';
import { useMasonryColumns, getResponsiveGap } from '../../hooks/useMasonryLayout';

// Mock data for testing
const mockImages = [
  { id: 1, width: 400, height: 300, title: 'Landscape 1', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/400/300?random=1' },
  { id: 2, width: 300, height: 500, title: 'Portrait 1', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/300/500?random=2' },
  { id: 3, width: 600, height: 400, title: 'Wide 1', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/600/400?random=3' },
  { id: 4, width: 400, height: 600, title: 'Tall 1', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/400/600?random=4' },
  { id: 5, width: 500, height: 300, title: 'Landscape 2', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/500/300?random=5' },
  { id: 6, width: 300, height: 400, title: 'Portrait 2', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/300/400?random=6' },
  { id: 7, width: 700, height: 300, title: 'Wide 2', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/700/300?random=7' },
  { id: 8, width: 400, height: 500, title: 'Portrait 3', s3_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/400/500?random=8' },
];

export default function DebugMasonry() {
  const [containerWidth, setContainerWidth] = useState(1200);
  
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const updateWidth = () => {
        const newWidth = node.offsetWidth;
        console.log('Container width updated:', newWidth);
        setContainerWidth(newWidth);
      };
      updateWidth();
      
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(node);
      
      return () => resizeObserver.disconnect();
    }
  }, []);

  const gap = getResponsiveGap(containerWidth);
  
  const { columns, columnWidth, columnCount } = useMasonryColumns(mockImages, {
    containerWidth,
    gap
  });
  
  console.log('Debug Masonry:', {
    containerWidth,
    gap,
    columnCount,
    columnWidth,
    imageCount: mockImages.length,
    columnsWithImages: columns.map(col => col.images.length)
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Masonry Layout Debug</h1>
        
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
          <p>Container Width: {containerWidth}px</p>
          <p>Column Count: {columnCount}</p>
          <p>Column Width: {Math.round(columnWidth)}px</p>
          <p>Gap: {gap}px</p>
          <p>Images: {mockImages.length}</p>
          <p>Columns with images: {columns.map(col => col.images.length).join(', ')}</p>
        </div>
        
        <div 
          ref={containerRef} 
          className="flex w-full items-start"
          style={{ gap: `${gap}px` }}
        >
          {columns.map((column) => (
            <div
              key={column.columnIndex}
              className="flex flex-col border-2 border-dashed border-blue-300 p-2"
              style={{ 
                width: `${columnWidth}px`,
                gap: `${gap}px`
              }}
            >
              <div className="text-xs text-blue-600 font-semibold mb-2">
                Column {column.columnIndex + 1} ({column.images.length} images)
              </div>
              {column.images.map((image) => (
                <div
                  key={image.id}
                  className="bg-white rounded-lg overflow-hidden shadow-sm border"
                  style={{
                    height: `${image.calculatedHeight}px`,
                  }}
                >
                  <div className="relative h-full w-full bg-gray-200">
                    <img
                      src={image.thumbnail_url}
                      alt={image.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {image.width}×{image.height} → {Math.round(image.calculatedHeight)}px
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}