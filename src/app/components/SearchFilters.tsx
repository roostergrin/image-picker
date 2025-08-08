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
}

export function SearchFilters({ onSearch, loading }: SearchFiltersProps) {
  const [query, setQuery] = useState('');
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [creator, setCreator] = useState('');
  const [keywordMode, setKeywordMode] = useState<'OR' | 'AND'>('AND');
  const [showAdvanced, setShowAdvanced] = useState(true);

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
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Search */}
        <div>
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

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            <svg 
              className={`inline ml-1 h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
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

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
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
        )}

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
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
  );
} 