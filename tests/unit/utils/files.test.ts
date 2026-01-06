import { describe, it, expect } from 'vitest';
import { isMediaFile } from '../../../src/utils/files';

describe('File Utils', () => {
  describe('isMediaFile', () => {
    it('should return true for image files', () => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
      
      imageExtensions.forEach((ext) => {
        expect(isMediaFile(`/path/to/image${ext}`)).toBe(true);
        expect(isMediaFile(`/path/to/IMAGE${ext.toUpperCase()}`)).toBe(true);
      });
    });

    it('should return true for video files', () => {
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
      
      videoExtensions.forEach((ext) => {
        expect(isMediaFile(`/path/to/video${ext}`)).toBe(true);
        expect(isMediaFile(`/path/to/VIDEO${ext.toUpperCase()}`)).toBe(true);
      });
    });

    it('should return true for audio files', () => {
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
      
      audioExtensions.forEach((ext) => {
        expect(isMediaFile(`/path/to/audio${ext}`)).toBe(true);
      });
    });

    it('should return true for font files', () => {
      const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
      
      fontExtensions.forEach((ext) => {
        expect(isMediaFile(`/path/to/font${ext}`)).toBe(true);
      });
    });

    it('should return false for non-media files', () => {
      const nonMediaFiles = [
        '/path/to/file.txt',
        '/path/to/document.pdf',
        '/path/to/script.js',
        '/path/to/style.css',
        '/path/to/data.json',
        '/path/to/page.html',
      ];
      
      nonMediaFiles.forEach((file) => {
        expect(isMediaFile(file)).toBe(false);
      });
    });

    it('should handle URLs with query parameters', () => {
      expect(isMediaFile('/images/photo.jpg?size=large')).toBe(true);
      expect(isMediaFile('/api/data.json?v=1')).toBe(false);
    });

    it('should handle URLs with fragments', () => {
      expect(isMediaFile('/images/photo.png#section')).toBe(true);
      expect(isMediaFile('/page.html#section')).toBe(false);
    });

    it('should handle complex paths', () => {
      expect(isMediaFile('/static/images/user/avatar.jpg')).toBe(true);
      expect(isMediaFile('/api/v1/users/123/profile.json')).toBe(false);
    });
  });
});

