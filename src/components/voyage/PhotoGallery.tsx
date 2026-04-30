import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { VoyagePhoto } from "@/services/api";

interface Props {
  photos: VoyagePhoto[];
  voyageName: string;
}

export const PhotoGallery = ({ photos, voyageName }: Props) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      if (e.key === "ArrowRight") setOpenIdx((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpenIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openIdx, photos.length]);

  if (photos.length === 0) return null;

  const active = openIdx !== null ? photos[openIdx] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary press-down focus:outline-none focus:ring-4 focus:ring-primary/30"
            aria-label={`${voyageName} — photo ${i + 1}`}
          >
            <img
              src={p.image_url}
              alt={p.caption || `${voyageName} — photo ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/15 transition-colors" />
          </button>
        ))}
      </div>

      {active && openIdx !== null && (
        <div
          className="fixed inset-0 z-[80] bg-ink/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpenIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpenIdx(null); }}
            aria-label="Close"
            className="absolute top-4 end-4 h-11 w-11 inline-flex items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20"
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpenIdx((i) => i === null ? null : (i - 1 + photos.length) % photos.length); }}
                aria-label="Previous"
                className="absolute start-3 sm:start-6 h-11 w-11 inline-flex items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20"
              >
                <ChevronLeft className="h-5 w-5 rtl:scale-x-[-1]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpenIdx((i) => i === null ? null : (i + 1) % photos.length); }}
                aria-label="Next"
                className="absolute end-3 sm:end-6 h-11 w-11 inline-flex items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20"
              >
                <ChevronRight className="h-5 w-5 rtl:scale-x-[-1]" />
              </button>
            </>
          )}

          <figure
            className="relative max-w-[95vw] max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.image_url}
              alt={active.caption || `${voyageName} — photo ${openIdx + 1}`}
              className="max-w-[95vw] max-h-[78vh] w-auto h-auto object-contain rounded-2xl shadow-card"
            />
            {active.caption && (
              <figcaption className="mt-3 text-center text-sm text-paper/80">
                {active.caption}
              </figcaption>
            )}
            <div className="mt-2 text-center text-xs text-paper/50 tabular-nums">
              {openIdx + 1} / {photos.length}
            </div>
          </figure>
        </div>
      )}
    </>
  );
};
