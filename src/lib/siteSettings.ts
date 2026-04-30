// Hero / site settings types + thin data wrappers.
// All data access goes through src/services/api.ts.

import { api } from "@/services/api";

export type HeroGradientStyle = "vignette" | "bottom" | "side" | "none";
export type HeroTextAlign = "start" | "center" | "end";

export interface HeroTextLocale {
  eyebrow?: string;
  title1?: string;
  title2?: string;
  subtitle?: string;
}

export interface HeroConfig {
  url?: string;
  overlayOpacity?: number; // 0..100
  gradientStyle?: HeroGradientStyle;
  textAlign?: HeroTextAlign;
  /** Localized hero copy. Empty/missing fields fall back to i18n defaults. */
  text?: {
    fr?: HeroTextLocale;
    ar?: HeroTextLocale;
  };
}

export const HERO_DEFAULTS: Required<Omit<HeroConfig, "url" | "text">> = {
  overlayOpacity: 55,
  gradientStyle: "vignette",
  textAlign: "start",
};

export const fetchSiteSetting = <T = unknown>(key: string): Promise<T | null> =>
  api.siteSettings.get<T>(key);

export const fetchHeroConfig = async (): Promise<HeroConfig> => {
  const v = (await fetchSiteSetting<HeroConfig>("hero_image")) ?? {};
  return {
    url: v.url,
    overlayOpacity:
      typeof v.overlayOpacity === "number" ? v.overlayOpacity : HERO_DEFAULTS.overlayOpacity,
    gradientStyle: v.gradientStyle ?? HERO_DEFAULTS.gradientStyle,
    textAlign: v.textAlign ?? HERO_DEFAULTS.textAlign,
    text: v.text,
  };
};

// Back-compat helper still used elsewhere
export const fetchHeroImageUrl = async (): Promise<string | null> => {
  const v = await fetchSiteSetting<{ url?: string }>("hero_image");
  return v?.url || null;
};
