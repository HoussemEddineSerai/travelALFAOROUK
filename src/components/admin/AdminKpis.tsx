import { TrendingUp, Users, Wallet, CheckCircle2, type LucideIcon } from "lucide-react";

interface Kpi {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning";
}

export const AdminKpis = ({ items }: { items: Kpi[] }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
    {items.map((k) => {
      const tone =
        k.tone === "success"
          ? "bg-success/10 text-success"
          : k.tone === "warning"
            ? "bg-warning/15 text-warning"
            : "bg-primary/10 text-primary";
      return (
        <div
          key={k.label}
          className="rounded-2xl border border-border bg-card p-4 md:p-5 hover:shadow-soft transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {k.label}
            </span>
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
              <k.icon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 font-display text-2xl md:text-3xl font-semibold tabular-nums leading-none">
            {k.value}
          </div>
          {k.hint && (
            <div className="mt-1.5 text-xs text-muted-foreground">{k.hint}</div>
          )}
        </div>
      );
    })}
  </div>
);

export { TrendingUp, Users, Wallet, CheckCircle2 };
