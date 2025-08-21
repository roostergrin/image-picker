'use client';

import { ImageGrid } from '../components/ImageGrid';

// Mock data that matches the AdobeStockImage interface
const mockAdobeImages = [
  {
    id: 1, title: 'Landscape 1', keywords: ['nature'], category: 'photos', 
    creator_name: 'John', creator_id: 1, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/400/300?random=1',
    width: 400, height: 300, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 2, title: 'Portrait 1', keywords: ['people'], category: 'photos',
    creator_name: 'Jane', creator_id: 2, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/300/500?random=2',
    width: 300, height: 500, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 3, title: 'Wide 1', keywords: ['landscape'], category: 'photos',
    creator_name: 'Bob', creator_id: 3, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/600/400?random=3',
    width: 600, height: 400, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 4, title: 'Tall 1', keywords: ['architecture'], category: 'photos',
    creator_name: 'Alice', creator_id: 4, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/400/600?random=4',
    width: 400, height: 600, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 5, title: 'Landscape 2', keywords: ['nature'], category: 'photos',
    creator_name: 'Charlie', creator_id: 5, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/500/300?random=5',
    width: 500, height: 300, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 6, title: 'Portrait 2', keywords: ['people'], category: 'photos',
    creator_name: 'David', creator_id: 6, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/300/400?random=6',
    width: 300, height: 400, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 7, title: 'Wide 2', keywords: ['landscape'], category: 'photos',
    creator_name: 'Eve', creator_id: 7, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/700/300?random=7',
    width: 700, height: 300, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  },
  {
    id: 8, title: 'Portrait 3', keywords: ['people'], category: 'photos',
    creator_name: 'Frank', creator_id: 8, license_date: '2024-01-01',
    download_url: '', comp_url: '', thumbnail_url: 'https://picsum.photos/400/500?random=8',
    width: 400, height: 500, description: null, is_licensed: true,
    s3_url: '', last_updated: '2024-01-01'
  }
];

export default function TestImageGrid() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">ImageGrid Component Test</h1>
        <p className="mb-8 text-gray-600">Testing the main ImageGrid component with mock data</p>
        
        <ImageGrid 
          images={mockAdobeImages}
          onImageSelect={(image) => {
            console.log('Selected image:', image.title);
            alert(`Selected: ${image.title}`);
          }}
          onCopyUrl={(url, label) => {
            console.log(`Copying ${label}:`, url);
            alert(`Copied ${label} to clipboard!`);
          }}
        />
      </div>
    </div>
  );
}