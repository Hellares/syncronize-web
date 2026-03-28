export type VideoType = 'youtube' | 'direct' | 'facebook' | 'vimeo' | 'tiktok' | 'unknown';

export function detectVideoType(url: string): VideoType {
  if (/youtu\.?be/i.test(url)) return 'youtube';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url)) return 'direct';
  return 'unknown';
}

export function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|.*[?&]v=))([^&#?]+)/);
  return match?.[1] || null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : null;
}

export function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}
