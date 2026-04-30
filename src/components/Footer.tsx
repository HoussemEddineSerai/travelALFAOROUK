import { useI18n } from "@/i18n/I18nProvider";
import { Mail, Phone, MapPin } from "lucide-react";
import { SmartAnchor } from "./SmartAnchor";

export const Footer = () => {
  const { t, lang } = useI18n();
  const year = new Date().getFullYear();

  const sections = [
    {
      title: lang === "ar" ? "الشركة" : "Compagnie",
      links: [
        { label: t("nav.about"), href: "#why" },
        { label: t("nav.contact"), href: "#contact" },
      ],
    },
    {
      title: lang === "ar" ? "الوجهات" : "Destinations",
      links: [
        { label: t("nav.excursions"), href: "#excursions" },
        { label: t("nav.organise"), href: "#voyages-organises" },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      {/* Same accent blobs as the Contact band for visual continuity */}
      <div className="blob bg-primary/40 -top-24 -end-24 h-72 w-72 hidden md:block" />
      <div className="blob bg-primary/25 -bottom-32 -start-24 h-80 w-80 hidden md:block" style={{ animationDelay: "-7s" }} />
      <div className="container py-10 sm:py-12 md:py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <SmartAnchor href="#top" className="flex items-baseline gap-1 group">
              <span className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
                Alfarouk
              </span>
              <span className="font-display text-xl sm:text-2xl text-primary">Voyage.</span>
            </SmartAnchor>
            <p className="mt-3 text-sm text-paper/70 max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="mt-5 space-y-2 text-sm text-paper/70">
              <a href="tel:+213000000000" className="flex items-center gap-2 hover:text-paper transition-colors">
                <Phone className="h-3.5 w-3.5 text-primary" /> +213 00 00 00 00
              </a>
              <a href="mailto:contact@alfarouk-voyage.com" className="flex items-center gap-2 hover:text-paper transition-colors break-all">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" /> contact@alfarouk-voyage.com
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Alger, Algérie
              </span>
            </div>
          </div>

          {/* Link sections */}
          {sections.map((s) => (
            <div key={s.title} className="md:col-span-3">
              <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-paper/60 font-medium">
                {s.title}
              </div>
              <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-2.5">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <SmartAnchor
                      href={l.href}
                      className="text-sm text-paper/70 hover:text-paper transition-colors story-link"
                    >
                      {l.label}
                    </SmartAnchor>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Languages mini-block */}
          <div className="md:col-span-1">
            <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-paper/60 font-medium">
              {t("lang")}
            </div>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-2.5 text-sm text-paper/70">
              <li>FR</li>
              <li>AR</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-5 sm:pt-6 border-t border-paper/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:gap-3">
          <div className="text-[11px] sm:text-xs text-paper/60">
            © {year} Alfarouk Voyage. {t("footer.rights")}
          </div>
          <div className="text-[11px] sm:text-xs text-paper/60">
            {lang === "ar" ? "صنع بشغف في الجزائر" : "Conçu avec passion en Algérie"}
          </div>
        </div>
      </div>
    </footer>
  );
};
