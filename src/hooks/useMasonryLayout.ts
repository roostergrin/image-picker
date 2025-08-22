import { useMemo } from 'react';

export interface ImageWithDimensions {
  id: number;
  width: number | null;
  height: number | null;
}

export interface MasonryColumn<T = ImageWithDimensions> {
  images: (T & { calculatedHeight: number })[];
  columnIndex: number;
}

interface UseMasonryColumnsOptions {
  containerWidth: number;
  gap: number;
}

export function useMasonryColumns<T extends ImageWithDimensions>(
  images: T[],
  options: UseMasonryColumnsOptions
): { columns: MasonryColumn<T>[], columnCount: number, columnWidth: number } {
  const { containerWidth, gap } = options;

  return useMemo(() => {
    if (!images.length || containerWidth <= 0) {
      return { columns: [], columnCount: 0, columnWidth: 0 };
    }

    // Calculate number of columns based on container width
    const getColumnCount = (width: number): number => {
      if (width < 640) return 2;   // Mobile
      if (width < 1024) return 3;  // Tablet
      if (width < 1440) return 4;  // Desktop
      return 5;                    // Large desktop
    };

    const columnCount = getColumnCount(containerWidth);
    
    // Calculate column width accounting for gaps
    const totalGaps = (columnCount - 1) * gap;
    const columnWidth = (containerWidth - totalGaps) / columnCount;

    // Initialize columns
    const columns: MasonryColumn<T>[] = [];
    const columnHeights: number[] = [];
    
    for (let i = 0; i < columnCount; i++) {
      columns.push({ images: [], columnIndex: i });
      columnHeights.push(0);
    }

    // Sort images into columns using shortest-column algorithm
    images.forEach((image) => {
      // Skip images without dimensions
      if (!image.width || !image.height || image.width <= 0 || image.height <= 0) {
        return;
      }

      // Calculate image height to maintain aspect ratio with fixed column width
      const aspectRatio = image.width / image.height;
      const calculatedHeight = columnWidth / aspectRatio;

      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Add image to shortest column
      columns[shortestColumnIndex].images.push({
        ...image,
        calculatedHeight
      });

      // Update column height (add image height + gap)
      columnHeights[shortestColumnIndex] += calculatedHeight + gap;
    });

    return {
      columns,
      columnCount,
      columnWidth
    };
  }, [images, containerWidth, gap]);
}

// Helper function to get responsive column count
export function getResponsiveColumns(containerWidth: number): number {
  if (containerWidth < 640) return 2;   // Mobile
  if (containerWidth < 1024) return 3;  // Tablet  
  if (containerWidth < 1440) return 4;  // Desktop
  return 5;                             // Large desktop
}

// Helper function to calculate optimal gap size
export function getResponsiveGap(containerWidth: number): number {
  if (containerWidth < 640) return 8;   // Smaller gaps on mobile
  if (containerWidth < 1024) return 12; // Medium gaps on tablet
  return 16;                            // Larger gaps on desktop
}