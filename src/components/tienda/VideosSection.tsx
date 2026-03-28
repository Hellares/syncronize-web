'use client';

import { useState } from 'react';
import { TiendaColors, alpha } from '@/lib/colors';
import { detectVideoType, getYoutubeEmbedUrl, getYoutubeId, getVimeoEmbedUrl } from '@/lib/video';

interface VideoItem {
  url: string;
  titulo?: string;
}

interface Props {
  videos: VideoItem[];
  colors: TiendaColors;
}

export function VideosSection({ videos, colors }: Props) {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  if (videos.length === 0) return null;

  return (
    <>
      <section className="max-w-7xl mx-auto px-2 md:px-6 mt-8">
        <div className="flex items-center justify-between mb-3 px-2 md:px-0">
          <h2 className="text-sm md:text-lg font-bold text-gray-900 flex items-center gap-1.5">
            <svg className="w-4 h-4 md:w-5 md:h-5" style={{ color: colors.primario }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Galeria de videos
          </h2>
        </div>

        {/* Carousel horizontal - mobile auto-scroll */}
        <div className="md:hidden overflow-hidden">
          <div className="flex gap-2.5 animate-videos-scroll">
            {[...videos, ...videos].map((video, i) => (
              <button
                key={i}
                onClick={() => setActiveVideo(i % videos.length)}
                className="flex-shrink-0 w-[140px] group"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden shadow-md border-2 border-transparent transition-all duration-300">
                  <VideoThumbnail url={video.url} />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 ml-0.5" style={{ color: colors.primario }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[7px] font-medium px-1 py-0.5 rounded">VIDEO</div>
                </div>
                {video.titulo && (
                  <p className="text-[9px] text-gray-700 font-medium mt-1 line-clamp-1 text-left px-0.5">{video.titulo}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop carousel - auto-scroll */}
        <div className="hidden md:block overflow-hidden">
          <div className="flex gap-4 animate-videos-scroll-desktop">
            {[...videos, ...videos].map((video, i) => (
              <button
                key={i}
                onClick={() => setActiveVideo(i % videos.length)}
                className="flex-shrink-0 w-[260px] group"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-md border-2 border-transparent transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.primario; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <VideoThumbnail url={video.url} />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                      <svg className="w-6 h-6 ml-0.5" style={{ color: colors.primario }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">VIDEO</div>
                </div>
                {video.titulo && (
                  <p className="text-xs text-gray-700 font-medium mt-2 line-clamp-1 text-left px-0.5 group-hover:text-gray-900 transition-colors">
                    {video.titulo}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modal/Lightbox */}
      {activeVideo !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setActiveVideo(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Content */}
          <div
            className="relative w-full max-w-4xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-10 right-0 md:-top-12 md:-right-2 text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span className="text-sm hidden md:inline">Cerrar</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Player */}
            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
              <VideoEmbed url={videos[activeVideo].url} />
            </div>

            {/* Titulo */}
            {videos[activeVideo].titulo && (
              <p className="text-white text-sm md:text-base font-medium mt-3 text-center">
                {videos[activeVideo].titulo}
              </p>
            )}

            {/* Navegación entre videos */}
            {videos.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {videos.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVideo(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeVideo ? 'w-6' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                    style={i === activeVideo ? { backgroundColor: colors.primario } : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const type = detectVideoType(url);

  if (type === 'youtube') {
    const embedUrl = getYoutubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl.replace('autoplay=0', 'autoplay=1')}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  if (type === 'vimeo') {
    const embedUrl = getVimeoEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          src={`${embedUrl}?autoplay=1`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  if (type === 'direct') {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
      />
    );
  }

  return <iframe src={url} className="w-full h-full" allowFullScreen />;
}

function VideoThumbnail({ url }: { url: string }) {
  const type = detectVideoType(url);

  if (type === 'youtube') {
    const id = getYoutubeId(url);
    if (id) {
      return <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />;
    }
  }

  // Videos directos: autoplay muted como preview
  if (type === 'direct') {
    return (
      <video
        src={url}
        muted
        autoPlay
        loop
        playsInline
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
      <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
