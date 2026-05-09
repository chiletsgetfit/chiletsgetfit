"use client";

import { useEffect, useRef, useState } from "react";

export function ExerciseDemo({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
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

  if (!images || images.length === 0) return null;

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
      {/* Preload the second frame so the swap is instant. */}
      {images.length > 1 && (
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
