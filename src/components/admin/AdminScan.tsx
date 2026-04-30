import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Search, CheckCircle2, AlertTriangle, User } from "lucide-react";
import { api } from "@/services/api";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";

interface BookingLite {
  id: string;
  tracking_code: string;
  full_name: string;
  voyage_name: string;
  travelers: number;
  status: "awaiting_payment" | "confirmed" | "cancelled";
  checked_in_at: string | null;
  pickup_point: string;
  phone_primary: string;
}

const SCAN_DIV_ID = "qr-reader-region";

export const AdminScan = () => {
  const { t, lang } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [booking, setBooking] = useState<BookingLite | null | undefined>(undefined);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false);

  const extractCode = (raw: string): string => {
    // raw could be a URL like https://.../track/ABC123 or just ABC123
    try {
      const url = new URL(raw);
      const parts = url.pathname.split("/").filter(Boolean);
      const i = parts.indexOf("track");
      if (i >= 0 && parts[i + 1]) return parts[i + 1].toUpperCase();
    } catch { /* not a URL */ }
    return raw.trim().toUpperCase();
  };

  const lookup = async (rawCode: string) => {
    const code = extractCode(rawCode);
    if (!code) return;
    try {
      const data = await api.bookings.byTrackingCode(code);
      setBooking(data ? {
        id: data.id,
        tracking_code: data.tracking_code,
        full_name: data.full_name,
        voyage_name: data.voyage_name,
        travelers: data.travelers,
        status: data.status,
        checked_in_at: data.checked_in_at,
        pickup_point: data.pickup_point,
        phone_primary: data.phone_primary,
      } : null);
    } catch {
      setBooking(null);
    }
  };

  const startScan = async () => {
    setScanning(true);
    setBooking(undefined);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(SCAN_DIV_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decoded) => {
            if (lockRef.current) return;
            lockRef.current = true;
            await stopScan();
            await lookup(decoded);
            setTimeout(() => { lockRef.current = false; }, 500);
          },
          () => { /* ignore parse errors */ }
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "camera error";
        toast.error(msg);
        setScanning(false);
      }
    }, 50);
  };

  const stopScan = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch { /* ignore */ }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScan(); };
  }, []);

  const checkIn = async () => {
    if (!booking) return;
    try {
      const sess = await api.auth.getSession();
      await api.bookings.checkIn(booking.id, sess?.userId ?? null);
      setBooking({ ...booking, checked_in_at: new Date().toISOString() });
      toast.success("✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "check-in failed");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold mb-1">{t("admin.scan.title")}</h2>
        <p className="text-sm text-muted-foreground mb-5">{t("admin.scan.help")}</p>

        <div className="flex items-center gap-2 mb-4">
          {!scanning ? (
            <button onClick={startScan}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary-deep">
              <Camera className="h-4 w-4" />
              {t("admin.scan.start")}
            </button>
          ) : (
            <button onClick={stopScan}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary">
              <CameraOff className="h-4 w-4" />
              {t("admin.scan.stop")}
            </button>
          )}
        </div>

        <div
          id={SCAN_DIV_ID}
          className={`rounded-2xl overflow-hidden bg-ink ${scanning ? "block" : "hidden"}`}
          style={{ minHeight: scanning ? 280 : 0 }}
        />

        <form
          onSubmit={(e) => { e.preventDefault(); lookup(manual); }}
          className="mt-4 flex items-center gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={t("admin.scan.manual")}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            dir="ltr"
          />
          <button type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary-deep">
            <Search className="h-4 w-4" />
            {t("admin.scan.lookup")}
          </button>
        </form>
      </div>

      {/* Result */}
      {booking === null && (
        <div className="mt-5 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
          {t("admin.scan.notFound")}
        </div>
      )}

      {booking && (
        <div className="mt-5 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-xs text-primary mb-1">{booking.tracking_code}</div>
              <h3 className="font-display text-2xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                {booking.full_name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {booking.voyage_name} · {booking.travelers}p · <span dir="ltr">{booking.phone_primary}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">📍 {booking.pickup_point}</p>
            </div>
          </div>

          {booking.status === "cancelled" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {t("admin.scan.cancelled")}
            </div>
          )}
          {booking.status === "awaiting_payment" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-warning/15 text-warning px-4 py-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {t("admin.scan.notConfirmed")}
            </div>
          )}

          {booking.checked_in_at ? (
            <div className="mt-4 rounded-2xl bg-success/10 p-4 text-success">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                {t("admin.checkedIn")}
              </div>
              <div className="text-xs mt-1 opacity-80">
                {t("admin.scan.checkedIn")} {new Date(booking.checked_in_at).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")}
              </div>
            </div>
          ) : (
            <button
              onClick={checkIn}
              disabled={booking.status === "cancelled"}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-success text-white py-4 font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <CheckCircle2 className="h-5 w-5" />
              {t("admin.scan.checkin")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
