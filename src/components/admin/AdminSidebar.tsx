import {
  LayoutDashboard,
  MapPinned,
  ScanLine,
  ShieldBan,
  LogOut,
  ChevronLeft,
  Home,
  Image as ImageIcon,
  MessageSquareQuote,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export type AdminTab = "bookings" | "voyages" | "hero" | "scan" | "blacklist" | "testimonials";

export const AdminSidebar = ({
  active,
  onChange,
  collapsed,
  onToggle,
  counts,
  onSignOut,
  mobileOpen = false,
  onMobileClose,
}: {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
  collapsed: boolean;
  onToggle: () => void;
  counts: { bookings: number; voyages?: number; blacklist?: number };
  onSignOut: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) => {
  const { t } = useI18n();

  const items: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "bookings", label: t("admin.bookings"), icon: LayoutDashboard, badge: counts.bookings },
    { id: "voyages", label: t("admin.voyages"), icon: MapPinned, badge: counts.voyages },
    { id: "hero", label: t("admin.hero"), icon: ImageIcon },
    { id: "testimonials", label: t("admin.testimonials"), icon: MessageSquareQuote },
    { id: "scan", label: t("admin.scan"), icon: ScanLine },
    { id: "blacklist", label: t("admin.blacklist"), icon: ShieldBan, badge: counts.blacklist },
  ];

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  // On mobile, choosing a tab closes the drawer
  const handleChange = (id: AdminTab) => {
    onChange(id);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden animate-fade-in"
          aria-hidden
        />
      )}

      <aside
        className={[
          // Mobile: off-canvas drawer
          "fixed inset-y-0 start-0 z-50 h-screen w-[260px] bg-card border-e border-border flex flex-col",
          "transform transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          // Desktop: static sidebar (always visible)
          "lg:sticky lg:top-0 lg:translate-x-0 lg:rtl:translate-x-0 lg:transition-[width]",
          collapsed ? "lg:w-[68px]" : "lg:w-[248px]",
        ].join(" ")}
      >
        {/* Brand */}
        <div className={`flex items-center ${collapsed ? "lg:justify-center" : "justify-between"} h-16 px-3 border-b border-border`}>
          {!collapsed ? (
            <a href="/" className="flex items-baseline gap-1 truncate">
              <span className="font-display text-lg font-semibold tracking-tight">Alfarouk</span>
              <span className="font-display text-lg text-primary">.</span>
            </a>
          ) : (
            <a href="/" className="hidden lg:block font-display text-xl font-semibold text-primary" title="Alfarouk">
              A
            </a>
          )}

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            aria-label="Close menu"
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Desktop collapse */}
          {!collapsed && (
            <button
              onClick={onToggle}
              aria-label={t("admin.collapse")}
              className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={onToggle}
            aria-label={t("admin.expand")}
            className="hidden lg:inline-flex mx-auto mt-2 h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 rotate-180 rtl:scale-x-[-1]" />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {!collapsed && (
            <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              {t("admin.nav.section.main")}
            </div>
          )}
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => handleChange(it.id)}
                  title={collapsed ? it.label : undefined}
                  className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active === it.id
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  } ${collapsed ? "lg:justify-center" : ""}`}
                >
                  <it.icon className="h-4 w-4 shrink-0" />
                  {(!collapsed || true) && (
                    <span className={collapsed ? "lg:hidden flex-1 text-start truncate" : "flex-1 text-start truncate"}>
                      {it.label}
                    </span>
                  )}
                  {typeof it.badge === "number" && it.badge > 0 && (
                    <span
                      className={`text-[10px] font-semibold rounded-full px-2 py-0.5 tabular-nums ${collapsed ? "lg:hidden" : ""} ${
                        active === it.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {it.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {!collapsed && (
            <div className="px-2 mt-6 mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              {t("admin.nav.section.tools")}
            </div>
          )}
          <ul className="space-y-1">
            <li>
              <a
                href="/"
                title={collapsed ? "Site" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary transition-colors ${
                  collapsed ? "lg:justify-center" : ""
                }`}
              >
                <Home className="h-4 w-4 shrink-0" />
                <span className={collapsed ? "lg:hidden truncate" : "truncate"}>Site public</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <button
            onClick={onSignOut}
            title={collapsed ? t("admin.signout") : undefined}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={collapsed ? "lg:hidden truncate" : "truncate"}>{t("admin.signout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
