'use client';

import { useState } from 'react';

interface SearchFiltersProps {
  onSearch: (filters: {
    query?: string;
    keywords?: string;
    category?: string;
    creator?: string;
    keywordMode?: 'OR' | 'AND';
  }) => void;
  loading: boolean;
  resultCount?: {
    current: number;
    total: number;
    currentPage: number;
    limit: number;
  };
}

export function SearchFilters({ onSearch, loading, resultCount }: SearchFiltersProps) {
  const [query, setQuery] = useState('');
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [creator, setCreator] = useState('');
  const [keywordMode, setKeywordMode] = useState<'OR' | 'AND'>('AND');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query: query.trim() || undefined,
      keywords: keywords.trim() || undefined,
      category: category.trim() || undefined,
      creator: creator.trim() || undefined,
      keywordMode: keywords.trim() ? keywordMode : undefined,
    });
  };

  const handleClear = () => {
    setQuery('');
    setKeywords('');
    setCategory('');
    setCreator('');
    setKeywordMode('OR');
    onSearch({});
  };

  return (
    <>
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Images
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title, description, or keywords..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Results Count */}
                {resultCount && resultCount.total > 0 && (
                  <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                    <span className="text-blue-600 font-semibold">{resultCount.total.toLocaleString()}</span> images found
                  </div>
                )}
                
                {/* Advanced Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <svg 
                    className={`h-4 w-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Filters
                </button>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
                Keywords
              </label>
              <input
                type="text"
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., dental, healthcare, office"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              
              {/* Keyword Mode Selector */}
              <div className="flex items-center space-x-4 pt-2">
                <span className="text-xs text-gray-600 font-medium">Search mode:</span>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="keywordMode"
                    value="OR"
                    checked={keywordMode === 'OR'}
                    onChange={(e) => setKeywordMode(e.target.value as 'OR' | 'AND')}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-1 text-xs text-gray-700">OR</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="keywordMode"
                    value="AND"
                    checked={keywordMode === 'AND'}
                    onChange={(e) => setKeywordMode(e.target.value as 'OR' | 'AND')}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-1 text-xs text-gray-700">AND</span>
                </label>
              </div>
              
              <p className="text-xs text-gray-500">
                {keywordMode === 'OR' 
                  ? 'Find images with any of the keywords (broader results)'
                  : 'Find images with all of the keywords (more specific results)'
                }
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Healthcare, Nature"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
                Creator
              </label>
              <input
                type="text"
                id="creator"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="e.g., Toseef, Adobe Stock"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            </div>

            {/* Quick Filter Tags */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">Quick filters:</span>
              {['dental', 'healthcare', 'office', 'medical', 'business', 'nature', 'technology'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>
        </div>
      )}
    </>
  );
} 