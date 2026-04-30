import { Helmet } from "react-helmet-async";
import { useI18n } from "@/i18n/I18nProvider";
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  buildHreflangs,
  clampDescription,
} from "@/lib/seo";

interface SEOProps {
  /** Page title — appended with site name unless `titleExact` is true */
  title: string;
  /** Plain meta description (≤160 chars after clamp) */
  description: string;
  /** Path for canonical/OG (e.g. "/voyage/djanet"). Defaults to current pathname. */
  path?: string;
  /** Open Graph image URL (absolute or root-relative) */
  image?: string;
  /** "website" | "article" — defaults to website */
  type?: "website" | "article";
  /** Render exact title without site suffix */
  titleExact?: boolean;
  /** Block indexing (e.g. tracking, admin) */
  noIndex?: boolean;
  /** Optional JSON-LD payloads to inject */
  jsonLd?: object | object[];
  /** Optional comma-separated keywords */
  keywords?: string;
}

/**
 * Centralized per-page SEO tags. Wrap top of any page component.
 *  - Sets title, description, canonical, hreflang
 *  - Open Graph / Twitter card
 *  - Optional JSON-LD structured data
 */
export const SEO = ({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  titleExact = false,
  noIndex = false,
  jsonLd,
  keywords,
}: SEOProps) => {
  const { lang } = useI18n();
  const currentPath =
    path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonical = absoluteUrl(currentPath);
  const fullTitle = titleExact ? title : `${title} — ${SITE_NAME}`;
  const desc = clampDescription(description);
  const ogImage = image.startsWith("http") ? image : absoluteUrl(image);
  const hreflangs = buildHreflangs(currentPath);
  const ogLocale = lang === "ar" ? "ar_DZ" : lang === "fr" ? "fr_DZ" : "en_US";
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />

      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      )}

      {/* hreflang */}
      {hreflangs.map((h) => (
        <link key={h.lang} rel="alternate" hrefLang={h.lang} href={h.href} />
      ))}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={ogLocale} />
      {ogLocale !== "fr_DZ" && <meta property="og:locale:alternate" content="fr_DZ" />}
      {ogLocale !== "ar_DZ" && <meta property="og:locale:alternate" content="ar_DZ" />}
      {ogLocale !== "en_US" && <meta property="og:locale:alternate" content="en_US" />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}

      {/* Misc */}
      <meta name="theme-color" content="#0F172A" />
      <meta name="application-name" content={SITE_NAME} />
      <meta property="og:see_also" content={SITE_URL} />
    </Helmet>
  );
};
