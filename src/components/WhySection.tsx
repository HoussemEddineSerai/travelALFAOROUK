import { useI18n } from "@/i18n/I18nProvider";
import { Link2, Compass, Wallet } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

export const WhySection = () => {
  const { t } = useI18n();
  const headerRef = useReveal();
  const gridRef = useReveal({ threshold: 0.05, rootMargin: "0px 0px -60px 0px" });

  const items = [
    { icon: Link2, title: t("why.1.title"), body: t("why.1.body") },
    { icon: Compass, title: t("why.2.title"), body: t("why.2.body") },
    { icon: Wallet, title: t("why.3.title"), body: t("why.3.body") },
  ];

  return (
    <section id="why" className="relative py-14 sm:py-16 md:py-24 lg:py-28 bg-secondary/60 overflow-hidden">
      <div className="blob bg-primary/15 -bottom-20 -left-10 h-72 w-72 hidden sm:block" />

      <div className="container relative">
        <div ref={headerRef} className="reveal max-w-2xl mb-10 sm:mb-12 md:mb-14">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.2em] uppercase text-primary">
            <span className="h-px w-6 sm:w-8 bg-primary" />
            {t("section.why.eyebrow")}
          </div>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-balance leading-[1.05]">
            {t("section.why.title")}
          </h2>
        </div>

        <div ref={gridRef} className="reveal grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {items.map((it, i) => (
            <div
              key={i}
              className="group relative rounded-3xl bg-card border border-border/60 p-6 sm:p-7 md:p-8 hover-lift hover:border-primary/40 press-down"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all">
                  <it.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="font-display text-sm tabular-nums text-muted-foreground/60">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-display mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl font-semibold">
                {it.title}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {it.body}
              </p>
              <div className="absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
