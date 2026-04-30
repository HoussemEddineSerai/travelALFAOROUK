import { MapPin, Globe2, Search, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchVoyages, type Voyage } from "@/data/voyages";
import { wilayas } from "@/data/wilayas";
import { fetchHeroConfig, HERO_DEFAULTS, type HeroConfig } from "@/lib/siteSettings";
import { heroAlignClasses, heroGradientClass } from "@/lib/heroStyles";
import { SmartAnchor } from "./SmartAnchor";
import defaultHero from "@/assets/hero-sahara.jpg";

type Mode = "excursion" | "organise";

export const Hero = () => {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<Mode>("excursion");
  const [query, setQuery] = useState("");
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [open, setOpen] = useState(false);
  const [heroCfg, setHeroCfg] = useState<HeroConfig>({ ...HERO_DEFAULTS });

  useEffect(() => {
    fetchVoyages().then(setVoyages).catch(() => {});
    fetchHeroConfig()
      .then(setHeroCfg)
      .catch(() => {});
  }, []);

  const heroSrc = heroCfg.url || defaultHero;
  const align = heroAlignClasses(heroCfg.textAlign ?? HERO_DEFAULTS.textAlign);
  const overlay = heroGradientClass(
    heroCfg.gradientStyle ?? HERO_DEFAULTS.gradientStyle,
    heroCfg.overlayOpacity ?? HERO_DEFAULTS.overlayOpacity,
  );

  // Editable hero copy with i18n fallback
  const localeText = heroCfg.text?.[lang];
  const heroEyebrow = (localeText?.eyebrow?.trim()) || t("hero.eyebrow");
  const heroTitle1 = (localeText?.title1?.trim()) || t("hero.title.1");
  const heroTitle2 = (localeText?.title2?.trim()) || t("hero.title.2");
  const heroSubtitle = (localeText?.subtitle?.trim()) || t("hero.sub");

  const suggestions = useMemo(() => {
    if (mode === "excursion") return [] as string[];
    const q = query.trim().toLowerCase();
    const countries = Array.from(
      new Set(
        voyages
          .filter((v) => v.kind === "organise")
          .map((v) => (lang === "ar" ? v.country.ar : v.country.fr))
          .filter(Boolean),
      ),
    );
    return q
      ? countries.filter((c) => c.toLowerCase().includes(q)).slice(0, 6)
      : countries.slice(0, 6);
  }, [query, mode, voyages, lang]);

  const submit = (value?: string) => {
    const v = (value ?? query).trim();
    // Notify VoyagesSection of the search/filter selection
    window.dispatchEvent(
      new CustomEvent("voyages:search", { detail: { kind: mode, q: v } }),
    );
    // Update URL for shareability
    const url = new URL(window.location.href);
    if (v) {
      url.searchParams.set("q", v);
      url.searchParams.set("kind", mode);
    } else {
      url.searchParams.delete("q");
      url.searchParams.delete("kind");
    }
    url.hash = mode === "excursion" ? "#excursions" : "#voyages-organises";
    window.history.replaceState(null, "", url.toString());
    // Smooth scroll with header offset
    const el = document.getElementById("voyages");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section id="top" className="relative">
      <div className="container pt-3 sm:pt-4 md:pt-6">
        {/* Hero canvas */}
        <div className="relative overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem] md:rounded-[2rem]">
          <img
            src={heroSrc}
            alt="Dunes du Tassili n'Ajjer au coucher du soleil — voyage au Sahara algérien avec Alfarouk Voyage"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
            className="w-full h-[72vh] min-h-[520px] max-h-[820px] object-cover scale-105 animate-fade-in"
          />
          {/* Layered overlays for depth & legibility (configurable) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: `rgba(0,0,0,${overlay.tintAlpha})` }}
          />
          {overlay.gradients.map((bg, i) => (
            <div
              key={i}
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: bg }}
            />
          ))}

          {/* Floating ambient blob accent */}
          <div className="blob bg-primary/30 -top-10 -right-16 h-56 w-56 hidden sm:block" />

          {/* Content layout — eyebrow top, title block bottom-left, stats bottom-right */}
          <div className="absolute inset-0 flex flex-col">
            {/* Top eyebrow */}
            <div className={`px-5 sm:px-8 md:px-12 lg:px-16 pt-5 sm:pt-7 md:pt-10 flex ${align.ctaRow}`}>
              <div className="inline-flex items-center gap-2 rounded-full bg-paper/10 backdrop-blur-md border border-paper/20 px-3 py-1.5 text-paper/90 text-[10px] md:text-[11px] tracking-[0.22em] uppercase animate-fade-in-up">
                <Sparkles className="h-3 w-3" />
                <span className="truncate max-w-[60vw] sm:max-w-none">{heroEyebrow}</span>
              </div>
            </div>

            {/* Spacer pushes title block to bottom */}
            <div className="flex-1" />

            {/* Title block — anchored near bottom, leaves room for the overlapping search bar + CTAs.
                Bottom padding must exceed the search bar's negative margin + its height so CTAs stay tappable. */}
            <div className={`px-5 sm:px-8 md:px-12 lg:px-16 pb-44 sm:pb-44 md:pb-44 lg:pb-48 flex ${align.wrapper}`}>
              <div className={`max-w-3xl animate-fade-in-up ${align.inner}`} style={{ animationDelay: "0.08s" }}>
                <h1 className="font-display text-paper text-balance text-[1.85rem] leading-[1.05] sm:text-[2.6rem] sm:leading-[1.02] md:text-[3.5rem] md:leading-[0.98] lg:text-[4.5rem] lg:leading-[0.96] font-semibold tracking-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
                  {heroTitle1}
                  <br />
                  <span className="italic font-light text-paper/95">{heroTitle2}</span>
                </h1>
                <p className="mt-2.5 sm:mt-3.5 md:mt-4 max-w-xl text-paper/90 text-[13px] sm:text-sm md:text-base leading-relaxed drop-shadow-[0_1px_12px_rgba(0,0,0,0.35)]">
                  {heroSubtitle}
                </p>
                <div className={`mt-3.5 sm:mt-4 md:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3 ${align.ctaRow}`}>
                  <SmartAnchor
                    href="#voyages"
                    className="group inline-flex items-center gap-2 rounded-full bg-paper text-ink px-5 sm:px-6 py-3 sm:py-3.5 text-sm md:text-base font-medium hover:bg-primary hover:text-paper transition-all shadow-soft hover:-translate-y-0.5 press-down"
                  >
                    {t("cta.discover")}
                    <ArrowRight className="h-4 w-4 arrow-cta rtl:scale-x-[-1]" />
                  </SmartAnchor>
                  <SmartAnchor
                    href="#why"
                    className="inline-flex items-center gap-2 rounded-full border border-paper/30 bg-paper/5 backdrop-blur-md px-5 sm:px-6 py-3 sm:py-3.5 text-sm md:text-base font-medium text-paper hover:bg-paper/15 transition-colors press-down"
                  >
                    {lang === "ar" ? "اعرف المزيد" : "En savoir plus"}
                  </SmartAnchor>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop stats — pinned to bottom-right corner of hero, opposite to title */}
          <div className="hidden md:flex absolute bottom-44 lg:bottom-48 end-12 lg:end-16 items-center gap-6 lg:gap-8 text-paper/80 animate-fade-in-up" style={{ animationDelay: "0.18s" }}>
            <Stat value="58" label={lang === "ar" ? "ولاية" : "Wilayas"} />
            <Divider />
            <Stat value="20+" label={lang === "ar" ? "وجهة دولية" : "Destinations"} />
            <Divider />
            <Stat value="4.9★" label={lang === "ar" ? "تقييم العملاء" : "Avis clients"} />
          </div>
        </div>

        {/* Reservation / Search Bar — overlapping for premium feel.
            Mobile uses a smaller negative margin so it never covers the hero CTAs. */}
        <div className="relative -mt-4 sm:-mt-6 md:-mt-12 mx-1 sm:mx-2 md:mx-10 lg:mx-16 animate-fade-in-up" style={{ animationDelay: "0.22s" }}>
          <div className="glass-strong rounded-2xl shadow-card p-2 sm:p-2.5 md:p-3">
            <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-2">
              {/* Mode segmented control */}
              <div className="grid grid-cols-2 md:inline-flex md:items-center bg-secondary rounded-xl md:rounded-[0.85rem] p-1 shrink-0">
                <SegmentBtn
                  active={mode === "excursion"}
                  onClick={() => { setMode("excursion"); setQuery(""); }}
                  icon={<MapPin className="h-4 w-4" />}
                  label={t("hero.search.tab.excursion")}
                />
                <SegmentBtn
                  active={mode === "organise"}
                  onClick={() => { setMode("organise"); setQuery(""); }}
                  icon={<Globe2 className="h-4 w-4" />}
                  label={t("hero.search.tab.organise")}
                />
              </div>

              {/* Search input */}
              <div className="flex-1 relative">
                <div className="flex items-center gap-2.5 bg-background border border-border rounded-xl md:rounded-[0.85rem] px-3.5 sm:px-4 h-12 md:h-11 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 transition-all">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={(e) => { if (e.key === "Enter") { setOpen(false); submit(); } }}
                    placeholder={
                      mode === "excursion"
                        ? t("hero.search.ph.excursion")
                        : t("hero.search.ph.organise")
                    }
                    className="flex-1 bg-transparent outline-none text-sm md:text-[15px] text-foreground placeholder:text-muted-foreground min-w-0"
                  />
                </div>

                {open && suggestions.length > 0 && (
                  <div className="absolute top-full mt-2 inset-x-0 bg-card border border-border rounded-2xl shadow-card z-30 overflow-hidden animate-scale-in origin-top">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/60">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {mode === "excursion"
                          ? (lang === "ar" ? "ولايات مقترحة" : "Wilayas suggérées")
                          : (lang === "ar" ? "وجهات مقترحة" : "Destinations suggérées")}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {suggestions.length}
                      </span>
                    </div>
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {suggestions.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setQuery(s); setOpen(false); submit(s); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start hover:bg-secondary transition-colors group"
                          >
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                                mode === "excursion"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-success/10 text-success"
                              }`}
                            >
                              {mode === "excursion" ? (
                                <MapPin className="h-3.5 w-3.5" />
                              ) : (
                                <Globe2 className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <span className="flex-1 truncate text-foreground">{s}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:scale-x-[-1]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => submit()}
                className="inline-flex items-center justify-center gap-2 rounded-xl md:rounded-[0.85rem] bg-ink text-paper h-12 md:h-11 px-5 sm:px-6 text-sm font-medium hover:bg-primary hover:shadow-glow transition-all shrink-0 press-down"
              >
                <Search className="h-4 w-4" />
                <span>{t("search.button")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile-only mini trust strip */}
        <div className="md:hidden mt-6 grid grid-cols-3 gap-2 animate-fade-in-up" style={{ animationDelay: "0.32s" }}>
          <MiniStat value="58" label={lang === "ar" ? "ولاية" : "Wilayas"} />
          <MiniStat value="20+" label={lang === "ar" ? "وجهة" : "Destinations"} />
          <MiniStat value="4.9★" label={lang === "ar" ? "تقييم" : "Avis"} />
        </div>
      </div>
    </section>
  );
};

const MiniStat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center shadow-soft">
    <div className="font-display text-lg font-semibold text-foreground leading-none">{value}</div>
    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
  </div>
);

const SegmentBtn = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`flex items-center justify-center gap-2 rounded-lg md:rounded-[0.65rem] px-3.5 h-10 md:h-9 text-xs md:text-sm font-medium transition-all text-center ${
      active
        ? "bg-card text-foreground shadow-soft"
        : "text-muted-foreground hover:text-foreground"
    }`}
  >
    {icon}
    <span className="truncate">{label}</span>
  </button>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="font-display text-2xl lg:text-3xl font-semibold text-paper leading-none">
      {value}
    </div>
    <div className="mt-1.5 text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-paper/70">
      {label}
    </div>
  </div>
);

const Divider = () => <div className="h-8 w-px bg-paper/20" />;
