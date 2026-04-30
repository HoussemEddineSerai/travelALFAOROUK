/**
 * Centralized SEO constants and helpers for Alfarouk Voyage.
 * Used by the <SEO> component and JSON-LD generators.
 */

export const SITE_URL = "https://alfaroukvoyage.dz";
export const SITE_NAME = "Alfarouk Voyage";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

export const absoluteUrl = (path = "/"): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const base = SITE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};

/** Trim/clean a description for meta tags (Google ~155-160 chars). */
export const clampDescription = (text: string, max = 158): string => {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/[\s,;:.!?-]+$/, "") + "…";
};

/** Build a hreflang map for a given canonical path. */
export const buildHreflangs = (path: string) => {
  const url = absoluteUrl(path);
  return [
    { lang: "fr", href: url },
    { lang: "ar", href: url },
    { lang: "en", href: url },
    { lang: "x-default", href: url },
  ];
};

/** Organization / TravelAgency JSON-LD for the homepage and global use. */
export const organizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  image: DEFAULT_OG_IMAGE,
  description:
    "Agence de voyage algérienne spécialisée dans les excursions et circuits organisés à travers l'Algérie et à l'international.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Alger",
    addressCountry: "DZ",
  },
  areaServed: { "@type": "Country", name: "Algeria" },
  sameAs: [],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["French", "Arabic", "English"],
      areaServed: "DZ",
    },
  ],
});

/** WebSite JSON-LD enabling sitelinks search box. */
export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["fr-DZ", "ar-DZ", "en"],
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const breadcrumbJsonLd = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: absoluteUrl(it.url),
  })),
});

interface TripArgs {
  name: string;
  description: string;
  image: string;
  url: string;
  priceDzd: number;
  days: number;
  region?: string;
  country?: string;
  kind: "excursion" | "organise";
}

/** TouristTrip JSON-LD for individual voyage pages. */
export const touristTripJsonLd = (a: TripArgs) => {
  const location = a.kind === "excursion" ? a.region || "Algérie" : a.country || a.region || "International";
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: a.name,
    description: a.description,
    image: a.image,
    url: absoluteUrl(a.url),
    touristType: a.kind === "excursion" ? "Domestic tourism" : "Outbound tourism",
    itinerary: {
      "@type": "ItemList",
      numberOfItems: a.days,
    },
    provider: {
      "@type": "TravelAgency",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: a.priceDzd,
      priceCurrency: "DZD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(a.url),
    },
    location: {
      "@type": "Place",
      name: location,
    },
  };
};
