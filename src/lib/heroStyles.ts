import type { HeroGradientStyle, HeroTextAlign } from "@/lib/siteSettings";

export const heroGradientClass = (
  style: HeroGradientStyle,
  opacity: number,
): { gradients: string[]; tintAlpha: number } => {
  const a = Math.max(0, Math.min(100, opacity)) / 100;
  // Always-on subtle base tint to keep text legible even at low opacities
  const tintAlpha = Math.max(0.18, a * 0.35);

  if (style === "none") {
    return { gradients: [], tintAlpha };
  }
  if (style === "bottom") {
    return {
      gradients: [
        `linear-gradient(to top, rgba(0,0,0,${a * 0.95}) 0%, rgba(0,0,0,${a * 0.4}) 45%, rgba(0,0,0,0) 80%)`,
      ],
      tintAlpha,
    };
  }
  if (style === "side") {
    return {
      gradients: [
        `linear-gradient(to right, rgba(0,0,0,${a * 0.85}) 0%, rgba(0,0,0,${a * 0.25}) 55%, rgba(0,0,0,0) 100%)`,
        `linear-gradient(to top, rgba(0,0,0,${a * 0.5}) 0%, rgba(0,0,0,0) 60%)`,
      ],
      tintAlpha,
    };
  }
  // vignette (default): top + bottom + slight side
  return {
    gradients: [
      `linear-gradient(to bottom, rgba(0,0,0,${a * 0.5}) 0%, rgba(0,0,0,${a * 0.15}) 35%, rgba(0,0,0,${a * 0.85}) 100%)`,
      `linear-gradient(to right, rgba(0,0,0,${a * 0.55}) 0%, rgba(0,0,0,0) 60%)`,
    ],
    tintAlpha,
  };
};

export const heroAlignClasses = (align: HeroTextAlign) => {
  switch (align) {
    case "center":
      return {
        wrapper: "items-center text-center",
        inner: "mx-auto text-center",
        ctaRow: "justify-center",
      };
    case "end":
      return {
        wrapper: "items-end text-end",
        inner: "ms-auto text-end",
        ctaRow: "justify-end",
      };
    default:
      return {
        wrapper: "items-start text-start",
        inner: "text-start",
        ctaRow: "justify-start",
      };
  }
};
