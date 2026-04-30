import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HeroEditorial } from "@/components/HeroEditorial";
import { VoyagesSection } from "@/components/VoyagesSection";
import { WhySection } from "@/components/WhySection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { CtaBand } from "@/components/CtaBand";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/i18n/I18nProvider";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/**
 * Switch hero design by changing this flag.
 *  - "classic"   → full-bleed image hero with reservation/search bar
 *  - "editorial" → asymmetric magazine-style hero with image collage + floating card
 *
 * You can also toggle live by appending ?hero=editorial or ?hero=classic to the URL.
 */
const DEFAULT_HERO: "classic" | "editorial" = "classic";

const Index = () => {
  const { lang } = useI18n();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const heroParam = params?.get("hero");
  const variant = heroParam === "editorial" || heroParam === "classic" ? heroParam : DEFAULT_HERO;

  const titles = {
    fr: "Excursions & Circuits Organisés en Algérie",
    ar: "رحلات وجولات منظمة في الجزائر",
  };
  const descriptions = {
    fr: "Agence de voyage algérienne. Excursions au Sahara, Tassili, Ghardaïa, Tipaza, Constantine et circuits internationaux organisés. Réservation en 30 secondes, sans compte.",
    ar: "وكالة سفر جزائرية. رحلات إلى الصحراء، الطاسيلي، غرداية، تيبازة، قسنطينة وجولات دولية منظمة. حجز في 30 ثانية، دون حساب.",
  };
  const keywords =
    "voyage Algérie, excursion Algérie, circuit organisé, Sahara, Tassili, Djanet, Ghardaïa, Tipaza, Constantine, agence voyage Alger, Alfarouk Voyage";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={titles[lang]}
        description={descriptions[lang]}
        path="/"
        keywords={keywords}
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
      <Header />
      <main>
        {variant === "editorial" ? <HeroEditorial /> : <Hero />}
        <VoyagesSection />
        <WhySection />
        <TestimonialsSection />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
