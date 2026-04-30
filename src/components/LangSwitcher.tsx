import { useI18n, type Lang } from "@/i18n/I18nProvider";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const langs: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

export const LangSwitcher = () => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span>{langs.find((l) => l.code === lang)?.label}</span>
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-32 rounded-2xl border border-border bg-card p-1 shadow-card z-50">
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full text-start px-3 py-2 rounded-xl text-sm transition-colors ${
                lang === l.code
                  ? "bg-ink text-paper"
                  : "hover:bg-secondary text-foreground"
              }`}
            >
              {l.code === "fr" && "Français"}
              {l.code === "ar" && "العربية"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
