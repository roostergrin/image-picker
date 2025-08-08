# Image Management System - Implementation Summary

## Project Overview
Build a simple image management system for Next.js that:
- Processes images (resize + convert to JPEG/WebP)
- Stores in S3
- Shows in an enhanced image picker
- Supports Adobe Stock downloads

## Core Architecture (5 files)
```
/lib/
  s3Client.js         # S3 upload/list functions
  imageProcessor.js   # Sharp image processing
/pages/api/
  process-image.js    # Upload endpoint
  adobe-stock.js      # Stock download endpoint
/components/
  ImagePicker.js      # Enhanced UI component
```

## Implementation Plan (TDD Approach)

### Part 1: S3 Client & Tests
```javascript
// lib/s3Client.test.js - WRITE FIRST
test('uploads image to S3', async () => {
  const url = await uploadImage(buffer, 'test.jpg');
  expect(url).toContain('s3.amazonaws.com');
});

test('lists images from S3', async () => {
  const images = await listImages();
  expect(Array.isArray(images)).toBe(true);
});

// lib/s3Client.js - THEN IMPLEMENT
// - uploadImage(buffer, filename) → returns URL
// - listImages() → returns array of URLs
// Use AWS SDK v3, handle errors
```

### Part 2: Image Processor & Tests
```javascript
// lib/imageProcessor.test.js - WRITE FIRST
test('creates 6 versions', async () => {
  const versions = await processImage(buffer);
  expect(versions).toHaveLength(6);
  // 3 sizes (1200w, 800w, 400w) × 2 formats (jpeg, webp)
});

// lib/imageProcessor.js - THEN IMPLEMENT
// Use Sharp to resize and convert
// Return array of {buffer, key, format, width}
```

### Part 3: API Routes & Tests
```javascript
// pages/api/process-image.test.js - WRITE FIRST
test('processes uploaded image', async () => {
  const formData = new FormData();
  formData.append('image', testFile);
  
  const res = await fetch('/api/process-image', {
    method: 'POST',
    body: formData
  });
  
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.urls).toHaveLength(6);
});

// Implement both API routes:
// - /api/process-image - handles file upload
// - /api/adobe-stock - downloads by stock ID
```

### Part 4: React Component & Tests
```javascript
// components/ImagePicker.test.js - WRITE FIRST
test('displays S3 images', async () => {
  render(<ImagePicker />);
  await waitFor(() => {
    expect(screen.getAllByRole('img')).toHaveLength(10);
  });
});

test('handles drag-drop upload', async () => {
  // Test file upload flow
});

// Enhance existing picker with:
// - S3 image grid
// - Drag & drop upload
// - Basic crop (react-image-crop)
// - Loading states
```

## Required Setup
```bash
# Install dependencies
npm install sharp aws-sdk-client-v3 react-image-crop
npm install -D @testing-library/react jest-environment-jsdom aws-sdk-client-mock

# Environment variables
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
S3_BUCKET_NAME=my-images
ADOBE_API_KEY=xxx
```

## Mock Configuration
```javascript
// __mocks__/sharp.js
module.exports = {
  default: jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake'))
  }))
};

// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

## Key Implementation Details
1. **S3 Client**: Use AWS SDK v3, return full URLs
2. **Image Processor**: Fixed sizes (1200, 800, 400), maintain aspect ratio
3. **API Routes**: Use formidable/multer for uploads, 10MB limit
4. **Component**: Extend existing picker, add upload zone
5. **Tests**: Write test first, then code (red-green-refactor)

## Success Criteria
- [ ] All tests pass
- [ ] Can upload images via drag & drop
- [ ] Images appear in picker after upload
- [ ] Can download Adobe Stock images by ID
- [ ] All images have 6 versions in S3

## Notes
- Sharp dependency might need platform-specific binaries in production
- Consider adding error handling strategy for S3 failures
- May want to add image metadata persistence (dimensions, upload date, etc.)

Ready to implement? Start with Part 1 (S3 Client).