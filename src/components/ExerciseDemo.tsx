"use client";

import { useEffect, useRef, useState } from "react";

function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function ExerciseDemo({
  images,
  videoUrl,
  alt,
}: {
  images: string[];
  videoUrl?: string | null;
  alt: string;
}) {
  const ytId = youtubeId(videoUrl);
  const hasGif = images && images.length > 0;
  const [expanded, setExpanded] = useState(false);

  if (!ytId && !hasGif) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        Show demo
      </button>
    );
  }

  return (
    <div>
      {ytId ? (
        <YouTubeDemo ytId={ytId} alt={alt} />
      ) : (
        <GifDemo images={images} alt={alt} />
      )}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
      >
        Hide demo
      </button>
    </div>
  );
}

function YouTubeDemo({ ytId, alt }: { ytId: string; alt: string }) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

  if (playing) {
    return (
      <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
          title={`${alt} demo`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play demo of ${alt}`}
      className="group relative mt-3 block aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity group-hover:bg-black/30">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 text-black transition-transform group-hover:scale-110">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 translate-x-[1px]"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

function GifDemo({ images, alt }: { images: string[]; alt: string }) {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrame((f) => (f + 1) % images.length);
      }, 650);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, images.length]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      setFrame(0);
    } else {
      setPlaying(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? `Pause demo of ${alt}` : `Play demo of ${alt}`}
      className="group relative mt-3 block aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[frame]}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {images.length > 1 && (
        // Preload the second frame so the swap is instant.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[1]}
          alt=""
          aria-hidden
          className="hidden"
          loading="lazy"
        />
      )}
      {!playing && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity group-hover:bg-black/30">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 text-black transition-transform group-hover:scale-110">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 translate-x-[1px]"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      )}
    </button>
  );
}
