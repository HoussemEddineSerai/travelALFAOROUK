import { cn } from "@/lib/utils";

export const Spinner = ({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) => (
  <span
    className={cn(size === "lg" ? "spinner-ring-lg" : "spinner-ring", className)}
    aria-label="Loading"
    role="status"
  />
);

interface FullLoaderProps {
  label?: string;
  sub?: string;
  /** When true, full-screen overlay; otherwise inline block. */
  overlay?: boolean;
}

export const FullLoader = ({ label, sub, overlay = false }: FullLoaderProps) => {
  const content = (
    <div className="flex flex-col items-center gap-4 text-center">
      <Spinner size="lg" />
      {label && (
        <div className="font-display text-base md:text-lg font-medium text-foreground">{label}</div>
      )}
      {sub && <div className="text-sm text-muted-foreground max-w-xs">{sub}</div>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in">
        <div className="rounded-3xl glass-strong shadow-card px-10 py-8">{content}</div>
      </div>
    );
  }
  return <div className="flex items-center justify-center py-16">{content}</div>;
};

export const SkeletonRow = ({ cols = 6 }: { cols?: number }) => (
  <tr className="border-t border-border">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="h-3 rounded-full shimmer" />
      </td>
    ))}
  </tr>
);
