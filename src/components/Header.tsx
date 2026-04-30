import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { LangSwitcher } from "./LangSwitcher";
import { SmartAnchor } from "./SmartAnchor";

export const Header = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#excursions", label: t("nav.excursions") },
    { href: "#voyages-organises", label: t("nav.organise") },
    { href: "#why", label: t("nav.about") },
    { href: "#contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60 animate-fade-in">
      <div className="container flex items-center justify-between h-14 sm:h-16 md:h-20">
        <SmartAnchor href="#top" className="flex items-baseline gap-1 group">
          <span className="font-display text-xl sm:text-2xl md:text-[1.7rem] font-semibold tracking-tight text-ink transition-colors group-hover:text-primary">
            Alfarouk
          </span>
          <span className="font-display text-xl sm:text-2xl md:text-[1.7rem] text-primary">
            Voyage.
          </span>
        </SmartAnchor>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <SmartAnchor
              key={l.href}
              href={l.href}
              className="story-link text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {l.label}
            </SmartAnchor>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          <LangSwitcher />
          <SmartAnchor
            href="#voyages"
            className="hidden md:inline-flex items-center rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-primary transition-all hover:shadow-glow press-down"
          >
            {t("cta.book")}
          </SmartAnchor>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden rounded-full p-2 hover:bg-secondary transition-colors"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-paper animate-fade-in">
          <div className="container py-3 sm:py-4 flex flex-col gap-1">
            {links.map((l, i) => (
              <SmartAnchor
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 rounded-xl text-base font-medium hover:bg-secondary transition-colors animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` } as React.CSSProperties}
              >
                {l.label}
              </SmartAnchor>
            ))}
            <SmartAnchor
              href="#voyages"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex justify-center rounded-full bg-ink text-paper px-5 py-3 text-base font-medium press-down"
            >
              {t("cta.book")}
            </SmartAnchor>
          </div>
        </div>
      )}
    </header>
  );
};
