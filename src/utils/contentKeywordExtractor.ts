/**
 * Content Keyword Extractor
 * 
 * Extracts meaningful keywords from content for image search,
 * based on the logic from the image assignment system.
 */

export interface ContentData {
  title?: string;
  body?: string;
  description?: string;
  category?: string;
}

// Words to ignore when extracting keywords
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
  'of', 'with', 'by', 'is', 'are', 'was', 'were', 'this', 'that', 'our',
  'we', 'you', 'your', 'it', 'its', 'they', 'their', 'has', 'have', 'had',
  'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'among', 'against', 'within', 'without'
]);

/**
 * Extract keywords from content data
 */
export function extractKeywords(content: ContentData): string[] {
  const keywords: string[] = [];
  
  // Priority order: title > category > description > body
  const textSources = [
    { text: content.title || '', weight: 3 },
    { text: content.category || '', weight: 2 },
    { text: content.description || '', weight: 2 },
    { text: content.body || '', weight: 1 }
  ];
  
  const keywordCounts = new Map<string, number>();
  
  textSources.forEach(({ text, weight }) => {
    if (!text.trim()) return;
    
    // Clean and split text
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')  // Remove punctuation except hyphens
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => 
        word.length > 2 && 
        !STOPWORDS.has(word) &&
        !/^\d+$/.test(word)  // Exclude pure numbers
      );
    
    words.forEach(word => {
      const count = keywordCounts.get(word) || 0;
      keywordCounts.set(word, count + weight);
    });
  });
  
  // Sort by frequency/weight and take top keywords
  const sortedKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)  // Top 10 keywords
    .map(([word]) => word);
  
  return sortedKeywords;
}

/**
 * Generate search suggestions based on content
 */
export function generateSearchSuggestions(content: ContentData): {
  keywords: string[];
  suggestedQuery: string;
  category: string;
} {
  const keywords = extractKeywords(content);
  
  // Create a natural search query from title or first few keywords
  const suggestedQuery = content.title || keywords.slice(0, 3).join(' ');
  
  // Determine category from content
  const category = content.category || '';
  
  return {
    keywords,
    suggestedQuery,
    category
  };
}

/**
 * Preview how content will be converted to search terms
 */
export function previewContentExtraction(content: ContentData): {
  extractedKeywords: string[];
  searchQuery: string;
  keywordString: string;
  category: string;
  sources: {
    title: string[];
    category: string[];
    description: string[];
    body: string[];
  };
} {
  const keywords = extractKeywords(content);
  const suggestions = generateSearchSuggestions(content);
  
  // Extract keywords from each source for transparency
  const extractFromText = (text: string) => {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !STOPWORDS.has(word) &&
        !/^\d+$/.test(word)
      )
      .slice(0, 5);  // Show first 5 from each source
  };
  
  return {
    extractedKeywords: keywords,
    searchQuery: suggestions.suggestedQuery,
    keywordString: keywords.join(', '),
    category: suggestions.category,
    sources: {
      title: extractFromText(content.title || ''),
      category: extractFromText(content.category || ''),
      description: extractFromText(content.description || ''),
      body: extractFromText(content.body || '')
    }
  };
}