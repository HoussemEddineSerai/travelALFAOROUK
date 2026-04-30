import { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useReveal } from "@/hooks/useReveal";
import { api, type Testimonial } from "@/services/api";

const pickMessage = (t: Testimonial, lang: "fr" | "ar") => {
  const m = lang === "ar" ? t.message_ar : t.message_fr;
  return m || t.message_fr || t.message_ar || t.message_en || "";
};

export const TestimonialsSection = () => {
  const { t, lang } = useI18n();
  const headerRef = useReveal();
  const gridRef = useReveal({ threshold: 0.05, rootMargin: "0px 0px -60px 0px" });
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.testimonials
      .listPublished()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  // Hide entirely if there's nothing to show — keeps the page clean.
  if (loaded && items.length === 0) return null;

  return (
    <section
      id="testimonials"
      className="relative py-14 sm:py-16 md:py-24 lg:py-28 overflow-hidden"
    >
      <div className="blob bg-primary/10 -top-20 -end-10 h-72 w-72 hidden sm:block" />

      <div className="container relative">
        <div ref={headerRef} className="reveal max-w-2xl mb-10 sm:mb-12 md:mb-14">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.2em] uppercase text-primary">
            <span className="h-px w-6 sm:w-8 bg-primary" />
            {t("section.testimonials.eyebrow")}
          </div>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-balance leading-[1.05]">
            {t("section.testimonials.title")}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
            {t("section.testimonials.sub")}
          </p>
        </div>

        <div
          ref={gridRef}
          className="reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {items.map((it, i) => (
            <article
              key={it.id}
              className="group relative rounded-3xl bg-card border border-border/60 p-6 sm:p-7 md:p-8 hover-lift hover:border-primary/40 press-down flex flex-col"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Quote className="absolute top-5 end-5 h-8 w-8 text-primary/15" aria-hidden />

              <div className="flex items-center gap-1 mb-3" aria-label={`${it.rating} / 5`}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-4 w-4 ${idx < it.rating ? "fill-primary text-primary" : "text-border"}`}
                  />
                ))}
              </div>

              <p
                className="text-sm sm:text-base text-foreground/85 leading-relaxed flex-1"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                “{pickMessage(it, lang)}”
              </p>

              <footer className="mt-5 pt-5 border-t border-border/60 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary overflow-hidden shrink-0 inline-flex items-center justify-center font-display text-base font-semibold">
                  {it.author_photo_url ? (
                    <img
                      src={it.author_photo_url}
                      alt={it.author_name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    it.author_name.trim().charAt(0).toUpperCase() || "·"
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{it.author_name}</div>
                  {it.voyage_slug && (
                    <a
                      href={`/voyage/${it.voyage_slug}`}
                      className="text-xs text-muted-foreground hover:text-primary truncate block"
                    >
                      /{it.voyage_slug}
                    </a>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
