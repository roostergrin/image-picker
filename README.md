# Adobe Stock Image Picker

A modern React/Next.js frontend for browsing, searching, and managing licensed Adobe Stock images.

## Features

### 🔍 **Advanced Search & Filtering**
- Text search across image titles, descriptions, and keywords
- Filter by specific keywords (comma-separated)
- Filter by category (e.g., Healthcare, Nature, Graphics)
- Filter by creator name
- Quick filter tags for common searches
- Real-time search results

### 🖼️ **Image Grid Display**
- Responsive grid layout (1-5 columns based on screen size)
- High-quality image previews using comp_url or S3 URLs
- Hover actions for quick URL copying
- License status badges
- S3 availability indicators
- Image metadata preview (dimensions, creator, keywords)

### 📋 **Copy & Paste Functionality**
- One-click URL copying with toast notifications
- Copy individual URLs (comp_url, S3 URL, thumbnail, download)
- Copy individual keywords or all keywords (comma/line separated)
- Copy all URLs for an image at once
- Clipboard integration with success/error feedback

### 🔍 **Detailed Image Modal**
- Full-screen image preview
- Tabbed interface (Details, URLs, Keywords)
- Complete image metadata display
- All available URLs with descriptions
- Interactive keyword tags (click to copy)
- Keyboard shortcuts (ESC to close)

### 📄 **Pagination & Navigation**
- Smart pagination with ellipsis for large result sets
- "Go to page" dropdown for quick navigation
- Results summary (showing X-Y of Z results)
- Mobile-friendly pagination controls

## API Integration

The frontend connects to your FastAPI backend endpoints:

### Search Endpoint
```
GET /auth/adobe/search-licensed
```

**Query Parameters:**
- `query` - Text search across title, description, keywords
- `keywords` - Comma-separated keywords to match
- `category` - Category filter
- `creator` - Creator name filter
- `limit` - Number of results per page (default: 20)
- `offset` - Pagination offset

**Response Format:**
```json
{
  "search_results": [
    {
      "id": 379735,
      "title": "happy girl outdoors",
      "keywords": ["girl", "children", "smile", ...],
      "category": "People",
      "creator_name": "Galina Barskaya",
      "creator_id": 38417,
      "license_date": "4/4/25, 4:34 PM",
      "download_url": "https://stock.adobe.com/Rest/Libraries/Download/379735/1",
      "comp_url": "https://stock.adobe.com/Rest/Libraries/Watermarked/Download/379735/2",
      "thumbnail_url": "https://as2.ftcdn.net/v2/jpg/...",
      "width": 3000,
      "height": 2000,
      "description": "Image description",
      "is_licensed": true,
      "s3_key": "adobe-stock-images/379735_happy_girl_outdoors.jpg",
      "s3_bucket": "licensed-adobe-assets",
      "s3_url": "https://licensed-adobe-assets.s3.amazonaws.com/...",
      "last_updated": "2025-06-18T15:49:27.420715"
    }
  ],
  "pagination": {
    "total_count": 1947,
    "returned_count": 20,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

## Setup & Development

### Prerequisites
- Node.js 18+ 
- Your Adobe Stock API backend running on `http://localhost:8000`

### Installation
```bash
cd image-picker
npm install
```

### Development
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Configuration

Update the API base URL in `src/app/page.tsx` if your backend runs on a different port:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

## Usage Guide

### 1. **Basic Search**
- Enter search terms in the main search box
- Use quick filter tags for common searches
- Results update in real-time

### 2. **Advanced Filtering**
- Click "Show Advanced Filters" to access additional options
- Use keywords field for specific keyword matching
- Filter by category or creator name
- Combine multiple filters for precise results

### 3. **Browsing Results**
- Hover over images to see quick action buttons
- Click any image to open the detailed modal
- Use pagination controls to browse through results

### 4. **Copying URLs**
- Hover over image and click copy icon for quick URL copy
- Open image modal for access to all available URLs
- URLs are organized by type with descriptions
- Toast notifications confirm successful copies

### 5. **Working with Keywords**
- View keyword previews on image cards
- Open modal's "Keywords" tab to see all keywords
- Click individual keywords to copy them
- Use "Copy All Keywords" for bulk copying

## URL Priority

The app intelligently selects the best image URL:

1. **S3 URL** - Highest quality, if available
2. **Comp URL** - Adobe Stock watermarked version
3. **Thumbnail URL** - Fallback option

## Components Architecture

```
src/app/
├── page.tsx              # Main application component
├── components/
│   ├── SearchFilters.tsx # Search and filtering interface
│   ├── ImageGrid.tsx     # Responsive image grid display
│   ├── ImageModal.tsx    # Detailed image view modal
│   ├── Pagination.tsx    # Navigation and pagination
│   └── Toast.tsx         # Success/error notifications
├── globals.css           # Global styles and utilities
└── layout.tsx           # App layout and metadata
```

## Responsive Design

- **Mobile (< 640px)**: Single column, simplified pagination
- **Tablet (640px - 1024px)**: 2-3 columns, touch-friendly interface  
- **Desktop (> 1024px)**: 4-5 columns, full feature set
- **Large screens (> 1280px)**: 5 columns, page jump dropdown

## Performance Features

- **Image lazy loading** with Next.js Image component
- **Responsive image sizing** based on container width
- **Loading states** for better user experience
- **Error handling** for failed image loads
- **Debounced search** to reduce API calls

## Browser Support

- Modern browsers with ES2020+ support
- Chrome 88+, Firefox 87+, Safari 14+, Edge 88+
- Clipboard API support for copy functionality

## Troubleshooting

### Images not loading
1. Check that your backend API is running on the correct port
2. Verify the image URLs in the API response
3. Check browser console for CORS or network errors

### Search not working
1. Verify API endpoint is accessible at `/auth/adobe/search-licensed`
2. Check backend logs for authentication or database issues
3. Ensure your licensed images are synced to S3

### Copy functionality not working
1. Ensure you're using HTTPS or localhost (required for Clipboard API)
2. Check browser permissions for clipboard access
3. Try refreshing the page if clipboard gets stuck

For more help, check the browser developer console for error messages.
