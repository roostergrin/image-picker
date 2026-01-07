/**
 * Types for JSON Image Analyzer
 */

export interface ImageSlot {
  /** Unique identifier for this image slot */
  id: string;
  /** JSON path to this image object (e.g., "Home[0].image" or "Home[3].items[1].image") */
  path: string;
  /** Current src value (empty string if needs image) */
  src: string;
  /** Current webp value (empty string if needs image) */
  webp: string;
  /** Alt text for the image */
  alt: string;
  /** Whether this slot needs an image (src is empty) */
  needsImage: boolean;
  /** Whether this image should be preserved (not replaced) */
  preserveImage: boolean;
  /** Context category from image_selection_hints */
  contextCategory?: string;
  /** Parent section title */
  sectionTitle?: string;
  /** Parent section layout type */
  sectionLayout?: string;
  /** Item title if this is within an items array */
  itemTitle?: string;
  /** Paragraph/description text from the section (for better context) */
  sectionDescription?: string;
  /** Full raw section data for agent to extract context from */
  rawSectionData?: Record<string, unknown>;
}

export interface ParsedSection {
  /** Page name (top-level key) */
  pageName: string;
  /** Index within the page array */
  sectionIndex: number;
  /** Layout type (acf_fc_layout) */
  layoutType: string;
  /** Section title if available */
  title?: string;
  /** All image slots found in this section */
  imageSlots: ImageSlot[];
  /** Total images needed */
  imagesNeeded: number;
  /** Total images that already have URLs */
  imagesHave: number;
  /** Raw section data for reference */
  rawData: Record<string, unknown>;
}

export interface ParsedPage {
  /** Page name (top-level key) */
  name: string;
  /** All sections in this page */
  sections: ParsedSection[];
  /** Total images needed across all sections */
  totalImagesNeeded: number;
  /** Total images that already have URLs */
  totalImagesHave: number;
}

export interface ParsedJson {
  /** All pages found */
  pages: ParsedPage[];
  /** Total images needed across entire JSON */
  totalImagesNeeded: number;
  /** Total images found */
  totalImages: number;
  /** Raw JSON for updates */
  rawJson: Record<string, unknown>;
}

export interface ImageAgentResult {
  id: number;
  title: string;
  thumbnail_url: string;
  comp_url?: string;
  keywords: string[];
  is_licensed: boolean;
  adobe_also_selected: boolean;
  s3_url?: string;
  filename?: string;
}

export interface ImageAgentResponse {
  success: boolean;
  results?: {
    licensed_results: ImageAgentResult[];
    catalog_results: ImageAgentResult[];
    top_licensed_pick?: ImageAgentResult;
    top_catalog_pick?: ImageAgentResult;
    overlap_count: number;
  };
  error?: string;
}

