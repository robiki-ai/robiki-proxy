/**
 * Checks if a file is a media file
 *
 * @param path - The path to the file
 * @returns true if the file is a media file, false otherwise
 * @example
 * isMediaFile('/path/to/image.png'); // => true
 * isMediaFile('/path/to/video.mp4'); // => true
 * isMediaFile('/path/to/audio.mp3'); // => true
 */
export function isMediaFile(path: string): boolean {
  const mediaExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.mp4',
    '.webm',
    '.ogg',
    '.mov',
    '.avi',
    '.mp3',
    '.wav',
    '.flac',
    '.aac',
    '.m4a',
    '.woff2',
    '.woff',
    '.ttf',
    '.eot',
    '.otf',
    '.ico',
  ];

  return mediaExtensions.some((ext) => {
    return path.split('?')[0].split('#')[0].toLowerCase().endsWith(ext);
  });
}
