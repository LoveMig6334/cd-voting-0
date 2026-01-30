import { enhanceImageData } from '../../lib/ocr/pipeline';

// Mock dependencies that might cause issues in Node environment
jest.mock('../../lib/ocr/opencv-loader', () => ({
  loadOpenCV: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../lib/ocr/detector', () => ({
  detectCard: jest.fn(),
  getMethodDescription: jest.fn(),
}));

describe('enhanceImageData Optimization', () => {
  it('should correctly enhance image data using the standard formula', () => {
    // Formula: output = (input - 200) * 1.6 + 200 + 5
    // where Contrast=1.6, Center=200, Brightness=5

    // Create a mock ImageData object
    // We'll test a few key values:
    // 0: (0 - 200)*1.6 + 205 = -320 + 205 = -115 -> clamped to 0
    // 100: (100 - 200)*1.6 + 205 = -160 + 205 = 45
    // 200: (200 - 200)*1.6 + 205 = 0 + 205 = 205
    // 255: (255 - 200)*1.6 + 205 = 88 + 205 = 293 -> clamped to 255

    const inputPixels = [0, 100, 200, 255];
    const expectedPixels = [0, 45, 205, 255];

    const width = inputPixels.length;
    const height = 1;
    // RGBA for each pixel
    const data = new Uint8ClampedArray(width * 4);

    for (let i = 0; i < width; i++) {
      data[i * 4] = inputPixels[i];     // R
      data[i * 4 + 1] = inputPixels[i]; // G
      data[i * 4 + 2] = inputPixels[i]; // B
      data[i * 4 + 3] = 255;            // A (should remain unchanged? actually the loop processes it? No, loop does i, i+1, i+2)
    }

    // enhanceImageData modifies data in place
    // We need to cast to ImageData because in Node environment ImageData might not be strictly typed or available
    const imageData = {
      data,
      width,
      height
    } as unknown as ImageData;

    enhanceImageData(imageData);

    for (let i = 0; i < width; i++) {
      expect(data[i * 4]).toBe(expectedPixels[i]);     // R
      expect(data[i * 4 + 1]).toBe(expectedPixels[i]); // G
      expect(data[i * 4 + 2]).toBe(expectedPixels[i]); // B
      expect(data[i * 4 + 3]).toBe(255);               // A (unchanged)
    }
  });
});
