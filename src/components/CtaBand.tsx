import { useI18n } from "@/i18n/I18nProvider";
import { useReveal } from "@/hooks/useReveal";
import { SmartAnchor } from "./SmartAnchor";

export const CtaBand = () => {
  const { t } = useI18n();
  const ref = useReveal();
  return (
    <section id="contact" className="py-14 sm:py-16 md:py-24 lg:py-28">
      <div className="container">
        <div
          ref={ref}
          className="reveal relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] bg-ink text-paper p-7 sm:p-10 md:p-16 shadow-card"
        >
          <div className="blob bg-primary/40 -top-24 -end-24 h-72 w-72" />
          <div className="blob bg-primary/25 -bottom-32 -start-24 h-80 w-80" style={{ animationDelay: "-7s" }} />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-paper/70 mb-3 sm:mb-4">
              <span className="h-px w-6 sm:w-8 bg-paper/40" />
              {t("section.voyages.eyebrow")}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-balance leading-[1.05]">
              {t("section.cta.title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-paper/75 text-sm sm:text-base md:text-lg max-w-xl">
              {t("section.cta.sub")}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-2.5 sm:gap-3">
              <SmartAnchor
                href="#voyages"
                className="group inline-flex items-center gap-2 rounded-full bg-paper text-ink px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-medium hover:bg-primary hover:text-paper transition-all hover:-translate-y-0.5 hover:shadow-glow press-down"
              >
                {t("cta.discover")}
                <span className="arrow-cta">→</span>
              </SmartAnchor>
              <a
                href="tel:+213000000000"
                className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-medium hover:bg-paper/10 transition-colors press-down"
              >
                +213 00 00 00 00
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
