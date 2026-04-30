import { ArrowRight, MapPin, Star, Sparkles, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { SmartAnchor } from "./SmartAnchor";
import hero from "@/assets/hero-sahara.jpg";
import alt1 from "@/assets/voyage-tipaza.jpg";
import alt2 from "@/assets/voyage-djanet.jpg";

/**
 * HeroEditorial — Alternative hero proposition.
 *
 * Concept: "Editorial Split"
 *  - Left: oversized magazine-style typography on a clean canvas
 *  - Right: stacked image collage with a floating "featured destination" card
 *  - Bottom: minimal stat strip (no search bar — search lives in the sticky header / a dedicated section)
 *
 * Differentiation from the current Hero:
 *  - No full-bleed image: feels calmer, more boutique / print-magazine.
 *  - Asymmetric grid creates a strong visual hierarchy.
 *  - Floating card teases a real voyage instead of a generic search box.
 */
export const HeroEditorial = () => {
  const { t, lang } = useI18n();

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute inset-0 -z-10 gradient-soft" />
      <div className="absolute -top-40 -end-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl -z-10" />
      <div className="absolute top-1/2 -start-32 h-[360px] w-[360px] rounded-full bg-primary/5 blur-3xl -z-10" />

      <div className="container pt-10 md:pt-16 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* LEFT — Editorial type block */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3.5 py-1.5 text-[11px] tracking-[0.2em] uppercase text-foreground/70 shadow-soft animate-float-up">
              <Sparkles className="h-3 w-3 text-primary" />
              {t("hero.eyebrow")}
            </div>

            <h1
              className="font-display mt-6 text-[2.6rem] leading-[1.02] md:text-[4.4rem] md:leading-[0.98] lg:text-[5.8rem] lg:leading-[0.96] font-semibold tracking-tight text-balance animate-float-up"
              style={{ animationDelay: "0.05s" }}
            >
              {t("hero.title.1")}{" "}
              <span className="relative inline-block">
                <span className="relative z-10 italic text-primary">
                  {t("hero.title.2")}
                </span>
                <span className="absolute inset-x-0 bottom-1 h-3 md:h-4 bg-primary/15 -z-0 rounded-sm" />
              </span>
            </h1>

            <p
              className="mt-6 max-w-xl text-muted-foreground text-base md:text-lg leading-relaxed animate-float-up"
              style={{ animationDelay: "0.12s" }}
            >
              {t("hero.sub")}
            </p>

            <div
              className="mt-8 flex flex-wrap items-center gap-3 animate-float-up"
              style={{ animationDelay: "0.18s" }}
            >
              <SmartAnchor
                href="#voyages"
                className="group inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-3.5 text-sm md:text-base font-medium hover:bg-primary transition-colors shadow-soft"
              >
                {t("cta.discover")}
                <ArrowRight className="h-4 w-4 arrow-cta rtl:scale-x-[-1]" />
              </SmartAnchor>
              <SmartAnchor
                href="#why"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm md:text-base font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {lang === "ar" ? "اعرف المزيد" : "En savoir plus"}
              </SmartAnchor>
            </div>

            {/* Stat strip */}
            <div
              className="mt-12 grid grid-cols-3 gap-6 max-w-lg animate-float-up"
              style={{ animationDelay: "0.24s" }}
            >
              <Stat value="58" label={lang === "ar" ? "ولاية" : "Wilayas"} />
              <Stat value="20+" label={lang === "ar" ? "وجهة دولية" : "Destinations"} />
              <Stat value="4.9" label={lang === "ar" ? "تقييم العملاء" : "Avis clients"} icon />
            </div>
          </div>

          {/* RIGHT — Image collage with floating card */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="relative animate-float-up" style={{ animationDelay: "0.1s" }}>
              {/* Main image */}
              <div className="relative overflow-hidden rounded-[2rem] aspect-[4/5] shadow-card">
                <img
                  src={hero}
                  alt="Sahara dunes at golden hour"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
              </div>

              {/* Top-right secondary image */}
              <div className="hidden md:block absolute -top-6 -end-6 w-40 h-52 rounded-2xl overflow-hidden border-4 border-background shadow-card rotate-[6deg]">
                <img src={alt1} alt="Tipaza" className="w-full h-full object-cover" />
              </div>

              {/* Bottom-left floating destination card */}
              <div className="absolute -bottom-6 -start-4 md:-start-10 w-[78%] md:w-[70%] glass-strong rounded-2xl p-4 md:p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0">
                    <img src={alt2} alt="Djanet" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                      <MapPin className="h-3 w-3" />
                      {lang === "ar" ? "وجهة الأسبوع" : "Destination du moment"}
                    </div>
                    <div className="font-display text-base md:text-lg font-semibold mt-0.5 truncate">
                      {lang === "ar" ? "جانت · الطاسيلي" : "Djanet · Tassili n'Ajjer"}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> 5j
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" /> 4.9
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/voyage/djanet"
                    className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper hover:bg-primary transition-colors"
                    aria-label="View"
                  >
                    <ArrowRight className="h-4 w-4 rtl:scale-x-[-1]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ value, label, icon }: { value: string; label: string; icon?: boolean }) => (
  <div>
    <div className="font-display text-2xl md:text-3xl font-semibold text-foreground flex items-center gap-1.5">
      {value}
      {icon && <Star className="h-4 w-4 fill-primary text-primary" />}
    </div>
    <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
  </div>
);
