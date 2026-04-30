import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, Clock, MapPin, Camera } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchVoyageBySlug, type Voyage } from "@/data/voyages";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { formatDzd } from "@/lib/format";
import { absoluteUrl, breadcrumbJsonLd, clampDescription, touristTripJsonLd } from "@/lib/seo";
import { api, type VoyagePhoto } from "@/services/api";
import { PhotoGallery } from "@/components/voyage/PhotoGallery";

const VoyageDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [voyage, setVoyage] = useState<Voyage | null | undefined>(undefined);
  const [photos, setPhotos] = useState<VoyagePhoto[]>([]);

  useEffect(() => {
    if (!slug) return;
    fetchVoyageBySlug(slug).then(setVoyage).catch(() => setVoyage(null));
    api.voyagePhotos.listBySlug(slug).then(setPhotos).catch(() => setPhotos([]));
  }, [slug]);



  if (voyage === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Chargement…"
          description="Découvrez ce voyage organisé par Alfarouk Voyage."
          noIndex
        />
        <Header />
        <div className="container py-32 text-center text-muted-foreground">…</div>
      </div>
    );
  }

  if (!voyage) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Voyage introuvable"
          description="Ce voyage n'existe plus ou a été déplacé."
          noIndex
        />
        <Header />
        <div className="container py-32 text-center">
          <p className="text-muted-foreground">Voyage introuvable.</p>
          <button onClick={() => nav("/")} className="mt-4 text-primary hover:underline">
            {t("cta.back")}
          </button>
        </div>
      </div>
    );
  }


  const included = voyage.included.length > 0
    ? voyage.included.map((it) => it[lang === "ar" ? "ar" : "fr"] || it.fr || it.ar)
    : [
        t("voyage.included.transport"),
        t("voyage.included.guide"),
        t("voyage.included.lodging"),
        t("voyage.included.activities"),
        t("voyage.included.insurance"),
      ];

  const voyageName = voyage.name[lang];
  const voyageDesc = clampDescription(
    voyage.description[lang] || voyage.tagline[lang] || `${voyageName} — ${voyage.days} jours avec Alfarouk Voyage.`
  );
  const voyagePath = `/voyage/${voyage.slug}`;
  const voyageImage = voyage.image?.startsWith("http") ? voyage.image : absoluteUrl(voyage.image);
  const breadcrumb = breadcrumbJsonLd([
    { name: lang === "ar" ? "الرئيسية" : "Accueil", url: "/" },
    { name: lang === "ar" ? "الرحلات" : "Voyages", url: "/#voyages" },
    { name: voyageName, url: voyagePath },
  ]);
  const trip = touristTripJsonLd({
    name: voyageName,
    description: voyageDesc,
    image: voyageImage,
    url: voyagePath,
    priceDzd: voyage.priceDzd,
    days: voyage.days,
    region: voyage.region[lang],
    country: voyage.country[lang],
    kind: voyage.kind,
  });

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <SEO
        title={voyageName}
        description={voyageDesc}
        path={voyagePath}
        image={voyageImage}
        type="article"
        keywords={[voyageName, voyage.region[lang], voyage.country[lang], voyage.wilaya, "Alfarouk Voyage"].filter(Boolean).join(", ")}
        jsonLd={[breadcrumb, trip]}
      />
      <Header />

      <main>
        {/* Hero */}
        <section className="container pt-6 md:pt-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
            {t("cta.back")}
          </Link>

          <div className="relative overflow-hidden rounded-3xl md:rounded-[2rem]">
            <img
              src={voyage.image}
              alt={`${voyage.name[lang]} — ${voyage.region[lang]} · Alfarouk Voyage`}
              fetchPriority="high"
              decoding="async"
              width={1920}
              height={1080}
              className="w-full h-[55vh] min-h-[420px] max-h-[640px] object-cover"
            />
            <div className="absolute inset-0 gradient-hero" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 text-paper">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-paper/80 mb-3">
                <MapPin className="h-3.5 w-3.5" />
                {voyage.region[lang]}
              </div>
              <h1 className="font-display text-balance text-3xl md:text-5xl lg:text-6xl font-semibold max-w-3xl">
                {voyage.name[lang]}
              </h1>
              <p className="mt-3 text-paper/85 text-base md:text-lg max-w-2xl">
                {voyage.tagline[lang]}
              </p>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="container mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-14">
          <div>
            <p className="text-lg leading-relaxed text-foreground/85 max-w-2xl">
              {voyage.description[lang]}
            </p>

            {photos.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl md:text-3xl font-semibold mb-5 flex items-center gap-3">
                  <Camera className="h-6 w-6 text-primary" />
                  {t("voyage.gallery")}
                  <span className="text-sm font-normal text-muted-foreground tabular-nums">
                    {photos.length}
                  </span>
                </h2>
                <PhotoGallery photos={photos} voyageName={voyage.name[lang]} />
              </div>
            )}

            <div className="mt-10">
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-5">
                {t("voyage.included")}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {included.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-foreground">{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <h2 className="font-display text-2xl md:text-3xl font-semibold mb-5">
                {t("voyage.itinerary")}
              </h2>
              <ol className="relative border-s-2 border-border ms-3">
                {voyage.itinerary.map((d) => (
                  <li key={d.day} className="ms-6 pb-7 last:pb-0">
                    <span className="absolute -start-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {d.day}
                    </span>
                    <h3 className="font-medium text-foreground">
                      {t("voyage.day")} {d.day} — {d.title[lang]}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {d.body[lang]}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Sticky booking card (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">{t("voyage.from")}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold text-foreground">
                  {formatDzd(voyage.priceDzd, lang)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("voyage.perPerson")}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {voyage.days} {t("voyage.days")}
              </div>
              <Link
                to={`/book/${voyage.slug}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3.5 font-medium hover:bg-primary-deep transition-colors"
              >
                {t("cta.bookNow")}
                <span className="arrow-cta">→</span>
              </Link>
            </div>
          </aside>
        </section>
      </main>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="container flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{t("voyage.from")}</div>
            <div className="font-display text-lg font-semibold text-foreground leading-tight">
              {formatDzd(voyage.priceDzd, lang)}
            </div>
          </div>
          <Link
            to={`/book/${voyage.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-3.5 font-medium"
          >
            {t("cta.bookNow")}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VoyageDetail;
