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
