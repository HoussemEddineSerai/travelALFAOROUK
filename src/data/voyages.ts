// Domain types and row-mapping helpers for the Voyage entity.
// Data access lives in src/services/api.ts.


type L = { fr: string; ar: string; en: string };

export interface ItineraryDay {
  day: number;
  title: L;
  body: L;
}

export interface IncludedItem {
  fr: string;
  ar: string;
}

export type VoyageKind = "excursion" | "organise";

export interface Voyage {
  id: string;
  slug: string;
  kind: VoyageKind;
  image: string;
  region: L;
  name: L;
  tagline: L;
  description: L;
  country: { fr: string; ar: string };
  wilaya: string;
  daira: string;
  commune: string;
  days: number;
  priceDzd: number;
  itinerary: ItineraryDay[];
  included: IncludedItem[];
  published: boolean;
  sortOrder: number;
}

interface VoyageRow {
  id: string;
  slug: string;
  kind: VoyageKind | null;
  region_fr: string; region_ar: string; region_en: string;
  name_fr: string; name_ar: string; name_en: string;
  tagline_fr: string; tagline_ar: string; tagline_en: string;
  description_fr: string; description_ar: string; description_en: string;
  country_fr: string | null; country_ar: string | null;
  wilaya: string | null; daira: string | null; commune: string | null;
  image_url: string;
  days: number;
  price_dzd: number;
  itinerary: unknown;
  included: unknown;
  published: boolean;
  sort_order: number;
}

const PLACEHOLDER = "/placeholder.svg";

const normalizeIncluded = (raw: unknown): IncludedItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => {
      if (typeof it === "string") return { fr: it, ar: it };
      const o = it as Record<string, unknown>;
      return { fr: String(o?.fr || ""), ar: String(o?.ar || "") };
    })
    .filter((x) => x.fr || x.ar);
};

export const rowToVoyage = (r: VoyageRow): Voyage => ({
  id: r.id,
  slug: r.slug,
  kind: (r.kind || "excursion") as VoyageKind,
  image: r.image_url || PLACEHOLDER,
  region: { fr: r.region_fr, ar: r.region_ar, en: r.region_en },
  name: { fr: r.name_fr, ar: r.name_ar || r.name_fr, en: r.name_en || r.name_fr },
  tagline: { fr: r.tagline_fr, ar: r.tagline_ar, en: r.tagline_en },
  description: { fr: r.description_fr, ar: r.description_ar, en: r.description_en },
  country: { fr: r.country_fr || "", ar: r.country_ar || "" },
  wilaya: r.wilaya || "",
  daira: r.daira || "",
  commune: r.commune || "",
  days: r.days,
  priceDzd: r.price_dzd,
  itinerary: Array.isArray(r.itinerary) ? (r.itinerary as ItineraryDay[]) : [],
  included: normalizeIncluded(r.included),
  published: r.published,
  sortOrder: r.sort_order,
});

/**
 * Thin compatibility wrappers around the public api service.
 * New code should import from "@/services/api" directly.
 */
import { api } from "@/services/api";

export const fetchVoyages = (includeUnpublished = false): Promise<Voyage[]> =>
  api.voyages.list({ includeUnpublished });

export const fetchVoyageBySlug = (slug: string): Promise<Voyage | null> =>
  api.voyages.bySlug(slug);

