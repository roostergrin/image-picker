# Quick Start Guide

## Prerequisites

1. **Backend API**: Your FastAPI backend should be running on `http://localhost:8000`
   - Adobe authentication should be set up
   - Licensed images should be synced to S3
   - Search endpoint should be available at `/auth/adobe/search-licensed`

2. **Node.js**: Version 18 or higher

## Starting the Image Picker

```bash
# From the image-picker directory
cd image-picker

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

The application will be available at: **http://localhost:3000**

## Quick Test

1. Open http://localhost:3000 in your browser
2. Try searching for "dental" or "healthcare"
3. Click on any image to see the detailed modal
4. Test the copy functionality by hovering over images

## Common Issues

### "Failed to search images"
- Check that your backend is running on port 8000
- Verify the search endpoint is working: `curl http://localhost:8000/auth/adobe/search-licensed`

### Images not displaying
- Check browser console for CORS errors
- Verify image URLs in the API response
- Ensure Next.js image domains are configured correctly

### Copy functionality not working
- Use HTTPS or localhost (Clipboard API requirement)
- Check browser permissions for clipboard access

## API Endpoint Test

Test your backend directly:
```bash
curl "http://localhost:8000/auth/adobe/search-licensed?query=dental&limit=5"
```

Should return JSON with `search_results` and `pagination` fields.

## Features to Try

1. **Search**: Use the main search box
2. **Filters**: Click "Show Advanced Filters"
3. **Quick Tags**: Click the preset filter tags below the search
4. **Image Actions**: Hover over images for copy buttons
5. **Modal View**: Click any image for detailed view
6. **Keywords**: Copy individual keywords or all at once
7. **URLs**: Access all image URLs (comp, S3, thumbnail, download)
8. **Pagination**: Navigate through results

Enjoy browsing your Adobe Stock images! 🎉 