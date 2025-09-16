'use client';

import { useState } from 'react';
import { ContextCard } from './ContextCard';
import { AdobeStockImage } from '../page';

interface ContextGridProps {
  onImageSelect: (image: AdobeStockImage) => void;
  onCopyUrl: (url: string, label: string) => void;
}

// Hardcoded 26 dental website contexts (ignoring asterisk ones)
const DENTAL_CONTEXTS = [
  // Home (6)
  "Home Hero",
  "What sets us apart", 
  "Locally owned",
  "Experienced",
  "Kid friendly",
  "Better Care",
  
  // About (2)
  "About Hero",
  "Virtual Tour",
  "Community",
  
  // New Patients / Get Started (3)
  "New Patients Hero", 
  "Initial Visit",
  "Flexible Payments",
  
  // Treatments (13)
  "Treatments Hero",
  "All Ages",
  "Kid",
  "Teen", 
  "Adult",
  "General",
  "Cleaning",
  "Restorative Treatments",
  "Extractions",
  "Surgery",
  "Gentle",
  "Special Needs",
  "Emergency",
  
  // Contact (1)
  "Contact Hero",
  
  // FAQ (1)
  "FAQ Hero"
];

export function ContextGrid({ onImageSelect, onCopyUrl }: ContextGridProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [globalKeywords, setGlobalKeywords] = useState('');

  const filteredContexts = DENTAL_CONTEXTS.filter(context =>
    context.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dental Website Contexts</h2>
            <p className="text-gray-600 mt-1">
              Showing {filteredContexts.length} of {DENTAL_CONTEXTS.length} contexts
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 max-w-2xl">
            {/* Search filter */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search contexts..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Global keywords filter */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  type="text"
                  value={globalKeywords}
                  onChange={(e) => setGlobalKeywords(e.target.value)}
                  placeholder="Global keywords (e.g., blue, modern)..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
              {globalKeywords && (
                <p className="text-xs text-green-600 mt-1">
                  Adding &quot;{globalKeywords}&quot; to all searches
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context grid */}
      {filteredContexts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contexts found</h3>
          <p className="text-gray-600">Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredContexts.map((contextName) => (
            <ContextCard
              key={contextName}
              contextName={contextName}
              globalKeywords={globalKeywords}
              onImageSelect={onImageSelect}
              onCopyUrl={onCopyUrl}
            />
          ))}
        </div>
      )}

      {/* Summary info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <div className="text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">About Context Recommendations</h3>
            <p className="text-sm text-blue-700 mt-1">
              Each context shows images from your Adobe Stock library that match relevant keywords. 
              Images are scored based on keyword matches in titles, descriptions, and metadata.
              Keywords with match counts are shown - green indicates matches found, gray indicates no matches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}