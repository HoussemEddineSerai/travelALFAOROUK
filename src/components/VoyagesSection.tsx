import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchVoyages, type Voyage, type VoyageKind } from "@/data/voyages";
import { ArrowUpRight, MapPin, Globe2, Compass, Clock } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

type Filter = "all" | VoyageKind;

const formatPrice = (n: number, lang: string) => {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} DZD`;
  }
};

const HASH_TO_FILTER: Record<string, Filter> = {
  "#excursions": "excursion",
  "#voyages-organises": "organise",
  "#voyages": "all",
};

const FILTER_TO_HASH: Record<Filter, string> = {
  all: "#voyages",
  excursion: "#excursions",
  organise: "#voyages-organises",
};

export const VoyagesSection = () => {
  const { t, lang } = useI18n();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchVoyages()
      .then(setVoyages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Sync with URL hash + ?q=… so Hero search can drive this section
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.toLowerCase();
      if (HASH_TO_FILTER[h]) {
        setFilter(HASH_TO_FILTER[h]);
        // Smooth-scroll with sticky header offset
        const el = document.getElementById("voyages");
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 88;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || "";
      setQuery(q);
    };
    apply();
    const onSearch = (e: Event) => {
      const ce = e as CustomEvent<{ kind: VoyageKind; q: string }>;
      if (ce.detail) {
        setFilter(ce.detail.kind);
        setQuery(ce.detail.q);
        const el = document.getElementById("voyages");
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 88;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    };
    window.addEventListener("hashchange", apply);
    window.addEventListener("voyages:search", onSearch as EventListener);
    return () => {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("voyages:search", onSearch as EventListener);
    };
  }, []);

  const onFilter = (f: Filter) => {
    setFilter(f);
    setQuery("");
    history.replaceState(null, "", FILTER_TO_HASH[f]);
  };

  const counts = useMemo(() => ({
    all: voyages.length,
    excursion: voyages.filter((v) => v.kind === "excursion").length,
    organise: voyages.filter((v) => v.kind === "organise").length,
  }), [voyages]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? voyages : voyages.filter((v) => v.kind === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((v) => {
        const hay = [
          v.name.fr, v.name.ar,
          v.region.fr, v.region.ar,
          v.country.fr, v.country.ar,
          v.wilaya, v.daira, v.commune,
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [voyages, filter, query]);

  const headerRef = useReveal();
  const pillsRef = useReveal();

  return (
    <section id="voyages" className="relative py-14 sm:py-16 md:py-24 lg:py-28 scroll-mt-20">
      {/* Backdrop accent */}
      <div className="absolute inset-x-0 top-0 h-[420px] gradient-soft -z-10" />
      <div className="blob bg-primary/20 -top-10 left-1/2 -translate-x-1/2 h-72 w-72 hidden md:block -z-10" />

      <div className="container">
        {/* Header */}
        <div ref={headerRef} className="reveal flex flex-col items-center text-center max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-primary mb-3 sm:mb-4">
            <span className="h-px w-6 sm:w-10 bg-primary/60" />
            {t("section.voyages.eyebrow")}
            <span className="h-px w-6 sm:w-10 bg-primary/60" />
          </div>
          <h2 className="font-display text-[1.6rem] leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-balance sm:leading-[1.05]">
            {t("section.voyages.title")}
          </h2>
          <p className="mt-4 sm:mt-5 text-muted-foreground leading-relaxed text-sm sm:text-base md:text-lg max-w-2xl">
            {t("section.voyages.sub")}
          </p>
        </div>

        {/* Segmentation pills */}
        <div ref={pillsRef} className="reveal flex justify-center mb-8 sm:mb-10 md:mb-14 -mx-2 px-2 overflow-x-auto scrollbar-none">
          <div className="inline-flex items-center gap-1 rounded-full glass shadow-soft p-1 sm:p-1.5 mx-auto">
            <CategoryPill
              active={filter === "all"}
              onClick={() => onFilter("all")}
              icon={<Compass className="h-4 w-4" />}
              label={t("section.voyages.cat.all")}
              count={counts.all}
            />
            <CategoryPill
              active={filter === "excursion"}
              onClick={() => onFilter("excursion")}
              icon={<MapPin className="h-4 w-4" />}
              label={t("section.voyages.cat.excursions")}
              sub={t("section.voyages.cat.excursions.sub")}
              count={counts.excursion}
            />
            <CategoryPill
              active={filter === "organise"}
              onClick={() => onFilter("organise")}
              icon={<Globe2 className="h-4 w-4" />}
              label={t("section.voyages.cat.organise")}
              sub={t("section.voyages.cat.organise.sub")}
              count={counts.organise}
            />
          </div>
        </div>

        {/* Active search chip */}
        {query && (
          <div className="flex justify-center mb-8 -mt-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-foreground">
              <span className="text-muted-foreground">{t("section.voyages.results")}:</span>
              <span className="font-medium">"{query}"</span>
              <button
                onClick={() => {
                  setQuery("");
                  const url = new URL(window.location.href);
                  url.searchParams.delete("q");
                  url.searchParams.delete("kind");
                  window.history.replaceState(null, "", url.toString());
                }}
                className="ms-1 inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-card text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Grid — uniform sizing, equal heights */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl bg-secondary animate-pulse h-[420px]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center text-muted-foreground">
            {t("section.voyages.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filtered.map((v, i) => (
              <VoyageCard key={v.id} voyage={v} lang={lang} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const CategoryPill = ({
  active,
  onClick,
  icon,
  label,
  sub,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  count: number;
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`group inline-flex items-center gap-1 sm:gap-2.5 rounded-full px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 text-[11px] sm:text-sm font-medium transition-all whitespace-nowrap press-down ${
      active
        ? "bg-ink text-paper shadow-soft scale-[1.02]"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`}
  >
    <span className={active ? "text-paper" : "text-primary"}>
      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4 inline-flex">
        {icon}
      </span>
    </span>
    <span className="flex flex-col items-start leading-tight">
      <span className="whitespace-nowrap">{label}</span>
      {sub && (
        <span
          className={`text-[10px] uppercase tracking-wider ${
            active ? "text-paper/70" : "text-muted-foreground"
          } hidden lg:inline`}
        >
          {sub}
        </span>
      )}
    </span>
    <span
      className={`text-[9px] sm:text-[10px] font-semibold rounded-full px-1.5 sm:px-2 py-0.5 tabular-nums ${
        active ? "bg-paper/15 text-paper" : "bg-secondary text-muted-foreground"
      }`}
    >
      {count}
    </span>
  </button>
);

const VoyageCard = ({
  voyage: v,
  lang,
  index,
}: {
  voyage: Voyage;
  lang: string;
  index: number;
}) => {
  const { t } = useI18n();
  const isExc = v.kind === "excursion";
  const locality = isExc
    ? [v.wilaya, v.commune].filter(Boolean).join(" · ") || v.region[lang as "fr" | "ar"]
    : v.country[lang as "fr" | "ar"] || v.region[lang as "fr" | "ar"];

  const accentRing = isExc ? "ring-primary/15" : "ring-success/15";
  const accentDotBg = isExc ? "bg-primary/15" : "bg-success/15";
  const accentDotText = isExc ? "text-primary" : "text-success";
  const accentSolid = isExc ? "bg-primary" : "bg-success";
  const accentText = isExc ? "text-primary" : "text-success";

  return (
    <Link
      to={`/voyage/${v.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-card border border-border/50 shadow-[0_2px_12px_-4px_hsl(var(--ink)/0.08)] hover:shadow-[0_24px_60px_-20px_hsl(var(--ink)/0.25)] hover:-translate-y-1.5 hover:border-border transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] animate-float-up"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      {/* Image — dominant visual */}
      <div className="relative overflow-hidden aspect-[5/6] bg-secondary rounded-[1.5rem] m-2 mb-0">
        <img
          src={v.image}
          alt={`${v.name[lang as "fr" | "ar"]} — ${locality}`}
          loading="lazy"
          decoding="async"
          width={1024}
          height={1228}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-110"
        />

        {/* Subtle bottom gradient — keeps photo bright */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />

        {/* Top row: type badge + duration */}
        <div className="absolute top-3 inset-x-3 flex items-start justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-paper/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-ink shadow-soft">
            <span className={`h-1.5 w-1.5 rounded-full ${accentSolid}`} />
            {isExc
              ? t("section.voyages.badge.local")
              : t("section.voyages.badge.international")}
          </div>

          <div className="inline-flex items-center gap-1 rounded-full bg-ink/60 backdrop-blur-md px-2 py-1 text-[10px] font-semibold text-paper shadow-soft">
            <Clock className="h-3 w-3" />
            {v.days}{lang === "ar" ? "ي" : "j"}
          </div>
        </div>

        {/* Locality chip overlaid bottom-left */}
        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-paper/15 backdrop-blur-md ring-1 ring-paper/25 px-2.5 py-1 text-[10.5px] font-medium text-paper max-w-[75%]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{locality}</span>
          </div>
        </div>
      </div>

      {/* Content area — clean, balanced */}
      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="font-display text-[1.2rem] sm:text-[1.3rem] font-semibold leading-[1.15] tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {v.name[lang as "fr" | "ar"]}
        </h3>

        {v.tagline[lang as "fr" | "ar"] && (
          <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-snug line-clamp-1">
            {v.tagline[lang as "fr" | "ar"]}
          </p>
        )}

        {/* Hairline divider */}
        <div className="relative mt-4 h-px bg-border/70 overflow-hidden">
          <div className={`absolute inset-y-0 left-0 w-0 group-hover:w-full transition-all duration-700 ease-out ${accentSolid}`} />
        </div>

        {/* Price + CTA pinned bottom */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="flex flex-col leading-tight">
            <span className="text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
              {t("voyage.from")}
            </span>
            <span className={`font-display text-[1.15rem] sm:text-[1.25rem] font-bold tabular-nums leading-tight ${accentText}`}>
              {formatPrice(v.priceDzd, lang)}
            </span>
          </div>

          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary text-foreground transition-all duration-400 ease-out group-hover:bg-ink group-hover:text-paper group-hover:scale-110 group-hover:rotate-[20deg]">
            <ArrowUpRight className="h-4 w-4 rtl:scale-x-[-1]" />
          </span>
        </div>
      </div>
    </Link>
  );
};
