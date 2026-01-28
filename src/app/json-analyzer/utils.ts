/**
 * Utilities for deep-scanning JSON to find image slots
 */

import { ImageSlot, ParsedSection, ParsedPage, ParsedJson } from './types';

/**
 * Check if a value is a non-null object (not array)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if an object looks like an image object (has src or webp properties)
 * Excludes video objects which also have src but have a 'type' property
 */
function isImageObject(obj: Record<string, unknown>): boolean {
  // Skip if it looks like a video object (has 'type' property like 'embedded', 'youtube', etc.)
  if ('type' in obj && typeof obj.type === 'string') {
    return false;
  }
  // Must have src or webp, and ideally alt or webp to confirm it's an image
  const hasSrc = 'src' in obj;
  const hasWebp = 'webp' in obj;
  const hasAlt = 'alt' in obj;
  // It's an image if it has webp, or if it has src AND alt
  return hasWebp || (hasSrc && hasAlt);
}

/**
 * Generate a unique ID for an image slot
 */
function generateSlotId(path: string): string {
  return `slot-${path.replace(/[\[\].]/g, '-')}`;
}

/**
 * Deep scan an object to find all image slots
 *
 * @param obj - Object to scan
 * @param currentPath - Current JSON path
 * @param sectionContext - Context from parent section
 * @param rawSectionData - Full raw section data for agent context
 * @returns Array of found image slots
 */
function deepScanForImages(
  obj: unknown,
  currentPath: string,
  sectionContext: { title?: string; layout?: string; description?: string; preserveImage?: boolean },
  rawSectionData?: Record<string, unknown>
): ImageSlot[] {
  const slots: ImageSlot[] = [];

  if (Array.isArray(obj)) {
    // Scan each array item
    obj.forEach((item, index) => {
      const itemPath = `${currentPath}[${index}]`;
      const itemTitle = isObject(item) ? (item.title as string) : undefined;
      
      slots.push(...deepScanForImages(item, itemPath, {
        ...sectionContext,
        // If item has a title, use it for context
        title: itemTitle || sectionContext.title
      }, rawSectionData));
    });
  } else if (isObject(obj)) {
    // Check if this object is an image object
    if (isImageObject(obj)) {
      const src = (obj.src as string) || '';
      const webp = (obj.webp as string) || '';
      const alt = (obj.alt as string) || '';
      const hints = obj.image_selection_hints as Record<string, unknown> | undefined;
      const contextCategory = hints?.context_category as string | undefined;

      slots.push({
        id: generateSlotId(currentPath),
        path: currentPath,
        src,
        webp,
        alt,
        needsImage: !src && !webp, // Needs image if both are empty
        preserveImage: sectionContext.preserveImage ?? false,
        contextCategory,
        sectionTitle: sectionContext.title,
        sectionLayout: sectionContext.layout,
        sectionDescription: sectionContext.description,
        rawSectionData,
      });
    }

    // Continue scanning nested properties
    for (const [key, value] of Object.entries(obj)) {
      // Skip certain keys that don't contain images
      if (['seo', 'component_options', 'button', 'buttons', 'video'].includes(key)) {
        continue;
      }
      
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      slots.push(...deepScanForImages(value, newPath, sectionContext, rawSectionData));
    }
  }

  return slots;
}

/**
 * Extract paragraph text from section data
 */
function extractParagraphText(sectionData: Record<string, unknown>): string | undefined {
  const paragraphs = sectionData.paragraphs as Array<{ text?: string }> | undefined;
  if (paragraphs && Array.isArray(paragraphs)) {
    const texts = paragraphs
      .map(p => p.text)
      .filter(Boolean)
      .join(' ');
    return texts || undefined;
  }
  return undefined;
}

/**
 * Parse a section (array item under a page)
 */
function parseSection(
  pageName: string,
  sectionIndex: number,
  sectionData: Record<string, unknown>
): ParsedSection {
  const layoutType = (sectionData.acf_fc_layout as string) || 'unknown';
  const title = (sectionData.title as string) || undefined;
  const description = extractParagraphText(sectionData);
  const preserveImage = sectionData.preserve_image === true;

  // Deep scan for all image slots, passing full section data for agent context
  const basePath = `${pageName}[${sectionIndex}]`;
  const imageSlots = deepScanForImages(sectionData, basePath, {
    title,
    layout: layoutType,
    description,
    preserveImage
  }, sectionData);

  // Filter out duplicates (parent image objects)
  const uniqueSlots = imageSlots.filter((slot, index, self) => {
    // Keep only the most specific path (no other path starts with this one)
    return !self.some((other, otherIndex) => 
      otherIndex !== index && other.path.startsWith(slot.path + '.')
    );
  });

  const imagesNeeded = uniqueSlots.filter(s => s.needsImage).length;
  const imagesHave = uniqueSlots.filter(s => !s.needsImage).length;

  return {
    pageName,
    sectionIndex,
    layoutType,
    title,
    imageSlots: uniqueSlots,
    imagesNeeded,
    imagesHave,
    rawData: sectionData
  };
}

/**
 * Parse a page (top-level key with array of sections)
 * @param pathPrefix - The path prefix for JSON updates (may include "pages." wrapper)
 * @param pageData - Array of section data
 * @param displayName - Optional clean display name (without path prefix)
 */
function parsePage(pathPrefix: string, pageData: unknown[], displayName?: string): ParsedPage {
  const sections: ParsedSection[] = [];

  pageData.forEach((sectionData, index) => {
    if (isObject(sectionData)) {
      // Skip SEO objects (they have 'seo' property at root level)
      if ('seo' in sectionData && !('acf_fc_layout' in sectionData)) {
        return;
      }
      sections.push(parseSection(pathPrefix, index, sectionData));
    }
  });

  const totalImagesNeeded = sections.reduce((sum, s) => sum + s.imagesNeeded, 0);
  const totalImagesHave = sections.reduce((sum, s) => sum + s.imagesHave, 0);

  return {
    name: displayName || pathPrefix,
    sections,
    totalImagesNeeded,
    totalImagesHave
  };
}

/**
 * Parse entire JSON structure
 *
 * Expected formats:
 * 1. Direct pages:
 * {
 *   "PageName": [ ...sections... ],
 *   "AnotherPage": [ ...sections... ]
 * }
 *
 * 2. Wrapped in "pages" key:
 * {
 *   "pages": {
 *     "PageName": [ ...sections... ],
 *     "AnotherPage": [ ...sections... ]
 *   }
 * }
 */
export function parseJsonForImages(json: Record<string, unknown>): ParsedJson {
  const pages: ParsedPage[] = [];

  // Check if JSON has a "pages" wrapper and extract it
  let pagesData: Record<string, unknown> = json;
  let hasWrapper = false;

  if ('pages' in json && isObject(json.pages)) {
    pagesData = json.pages as Record<string, unknown>;
    hasWrapper = true;
  }

  for (const [key, value] of Object.entries(pagesData)) {
    // Each top-level key should be a page with an array of sections
    if (Array.isArray(value)) {
      // Adjust path prefix if wrapped in "pages"
      const pathPrefix = hasWrapper ? `pages.${key}` : key;
      // Use the original key as display name (without "pages." prefix)
      pages.push(parsePage(pathPrefix, value, key));
    }
  }

  const totalImagesNeeded = pages.reduce((sum, p) => sum + p.totalImagesNeeded, 0);
  const totalImages = pages.reduce((sum, p) => sum + p.totalImagesNeeded + p.totalImagesHave, 0);

  return {
    pages,
    totalImagesNeeded,
    totalImages,
    rawJson: json
  };
}

/**
 * Update an image slot in the JSON with new URLs
 * 
 * @param json - Original JSON object
 * @param path - Path to the image object (e.g., "Home[0].image")
 * @param src - New src URL
 * @param webp - New webp URL (optional, defaults to src with webp transformation)
 * @returns Updated JSON object
 */
export function updateImageSlot(
  json: Record<string, unknown>,
  path: string,
  src: string,
  webp?: string
): Record<string, unknown> {
  // Deep clone the JSON
  const updated = JSON.parse(JSON.stringify(json));
  
  // Parse the path and navigate to the target
  const parts = path.match(/([^[\].]+|\[\d+\])/g) || [];
  let current: unknown = updated;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    
    // Handle array index
    if (part.startsWith('[') && part.endsWith(']')) {
      const index = parseInt(part.slice(1, -1), 10);
      if (Array.isArray(current)) {
        if (isLast) {
          // This shouldn't happen - last part should be an object
          break;
        }
        current = current[index];
      }
    } else {
      // Handle object property
      if (isObject(current)) {
        if (isLast) {
          // Update the image object
          const imageObj = current[part] as Record<string, unknown>;
          if (imageObj) {
            imageObj.src = src;
            imageObj.webp = webp || src.replace(/f-jpg/, 'f-webp').replace(/\.jpg/, '.webp');
          }
        } else {
          current = current[part];
        }
      }
    }
  }
  
  return updated;
}

/**
 * CloudFront domain for stock images (set via environment variable)
 */
const CLOUDFRONT_IMAGE_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_IMAGE_DOMAIN || '';

/**
 * Get stock image URL for an image
 * Uses CloudFront if configured, otherwise falls back to ImageKit
 *
 * @deprecated Use getStockImageUrl for new code. This function name is kept for backward compatibility.
 */
export function getImageKitUrl(filename: string, width: number = 1000): { src: string; webp: string } {
  return getStockImageUrl(filename, width >= 1920);
}

/**
 * Get stock image URL for an image
 * Uses CloudFront if configured, otherwise falls back to ImageKit
 */
export function getStockImageUrl(filename: string, isHero: boolean = false): { src: string; webp: string } {
  // Clean the filename - remove any path prefix and extension
  const cleanFilename = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || filename;

  if (CLOUDFRONT_IMAGE_DOMAIN) {
    const sizePrefix = isHero ? 'hero' : 'standard';
    const baseUrl = `https://${CLOUDFRONT_IMAGE_DOMAIN}`;
    const src = `${baseUrl}/${sizePrefix}/${cleanFilename}.jpg`;
    const webp = `${baseUrl}/${sizePrefix}/${cleanFilename}.webp`;
    return { src, webp };
  }

  // Fallback to ImageKit
  const baseUrl = 'https://ik.imagekit.io/rooster';
  const transform = isHero ? 'tr:w-1920,h-1280' : 'tr:w-1000';
  const src = `${baseUrl}/${transform},f-jpg,q-auto,fo-auto/${filename}`;
  const webp = `${baseUrl}/${transform},f-webp,q-auto,fo-auto/${filename}`;
  return { src, webp };
}

/**
 * Format layout type for display
 */
export function formatLayoutType(layout: string): string {
  return layout
    .replace(/^block_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get a display name for an image slot
 */
export function getSlotDisplayName(slot: ImageSlot): string {
  if (slot.contextCategory) {
    return slot.contextCategory;
  }
  if (slot.itemTitle) {
    return slot.itemTitle;
  }
  if (slot.alt) {
    return slot.alt.slice(0, 50) + (slot.alt.length > 50 ? '...' : '');
  }
  return slot.sectionLayout ? formatLayoutType(slot.sectionLayout) : 'Image';
}

