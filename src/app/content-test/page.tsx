'use client';

import { useState, useEffect } from 'react';
import { ImageModal } from '../components/ImageModal';
import { Toast } from '../components/Toast';
import { ContextGrid } from '../components/ContextGrid';
import { apiClient, setInMemoryInternalApiKey } from '../../services/apiService';
import { AdobeStockImage } from '../page';

declare global {
  interface Window { __INTERNAL_API_TOKEN__?: string }
}

const TokenGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setChecking(true);
      
      // Check localStorage for saved token
      const savedToken = localStorage.getItem('INTERNAL_API_TOKEN') || localStorage.getItem('internalApiToken');
      
      if (!savedToken) {
        // No token found, redirect to main auth page
        window.location.href = '/';
        return;
      }
      
      // Try to verify the saved token
      try {
        setInMemoryInternalApiKey(savedToken);
        window.__INTERNAL_API_TOKEN__ = savedToken;
        const response = await apiClient.get('/api/health');
        
        if (response && response.status === 200) {
          setVerified(true);
        } else {
          throw new Error('Health check failed');
        }
      } catch (err) {
        // Token is invalid, clear it and redirect to main auth page
        setInMemoryInternalApiKey(null);
        window.__INTERNAL_API_TOKEN__ = undefined;
        localStorage.removeItem('INTERNAL_API_TOKEN');
        localStorage.removeItem('internalApiToken');
        window.location.href = '/';
        return;
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (verified) return <>{children}</>;

  // This shouldn't be reached due to redirects, but just in case
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <p className="text-gray-600">Redirecting to authentication...</p>
      </div>
    </div>
  );
};

export default function ContentTestPage() {
  const [selectedImage, setSelectedImage] = useState<AdobeStockImage | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: `${label} copied!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
      setToast({ message: `Failed to copy ${label}`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <TokenGate>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dental Website Context Images</h1>
                <p className="mt-2 text-gray-600">
                  Explore image recommendations organized by 26 dental website contexts.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ContextGrid
            onImageSelect={setSelectedImage}
            onCopyUrl={copyToClipboard}
          />
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <ImageModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onCopyUrl={copyToClipboard}
          />
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </TokenGate>
  );
}