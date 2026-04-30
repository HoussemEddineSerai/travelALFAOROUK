import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Check,
  Copy,
  Printer,
  Upload,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowLeft,
  Phone,
  MapPin,
  QrCode,
  Download,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { api } from "@/services/api";
import { formatDzd } from "@/lib/format";
import { AGENCY } from "@/lib/agency";
import { generateQrDataUrl, buildTrackingUrl } from "@/lib/qr";
import { downloadBadge, type BadgeTripType } from "@/lib/bookingBadge";
import { toast } from "sonner";

interface Booking {
  id: string;
  tracking_code: string;
  voyage_slug: string;
  voyage_name: string;
  full_name: string;
  phone_primary: string;
  phone_secondary: string | null;
  travelers: number;
  wilaya: string;
  daira: string;
  baladya: string;
  pickup_point: string;
  total_dzd: number;
  status: "awaiting_payment" | "confirmed" | "cancelled";
  receipt_url: string | null;
  voice_note_url: string | null;
  checked_in_at: string | null;
  created_at: string;
}

const Track = () => {
  const { code } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const justConfirmed = params.get("confirmed") === "1";
  const { t, lang } = useI18n();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [tripType, setTripType] = useState<BadgeTripType>("excursion");
  const [downloadingBadge, setDownloadingBadge] = useState(false);

  useEffect(() => {
    // Title is handled by <SEO /> below; tracking pages are noindex.
    if (justConfirmed) {
      // store locally so user can find it again
      const list = JSON.parse(localStorage.getItem("alfarouk.myBookings") || "[]");
      if (code && !list.includes(code)) {
        list.unshift(code);
        localStorage.setItem("alfarouk.myBookings", JSON.stringify(list.slice(0, 20)));
      }
    }
  }, [code, t, justConfirmed]);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const data = await api.bookings.byTrackingCode(code);
      setBooking(data);
      setLoading(false);
      if (data) {
        try {
          const url = await generateQrDataUrl(buildTrackingUrl(code));
          setQrUrl(url);
        } catch (e) { console.error(e); }
        // Determine trip type from the voyage record
        try {
          const v = await api.voyages.bySlug(data.voyage_slug);
          if (v?.kind === "organise") setTripType("organise");
          else setTripType("excursion");
        } catch (e) { /* fallback excursion */ }
      }
    })();
  }, [code]);

  const handleDownloadBadge = async () => {
    if (!booking) return;
    setDownloadingBadge(true);
    try {
      await downloadBadge({
        trackingCode: booking.tracking_code,
        fullName: booking.full_name,
        voyageName: booking.voyage_name,
        tripType,
        travelers: booking.travelers,
        pickupPoint: booking.pickup_point,
        wilaya: booking.wilaya,
        totalDzd: booking.total_dzd,
        lang,
      });
      toast.success(t("badge.downloaded"));
    } catch (e) {
      console.error(e);
      toast.error(t("booking.error"));
    } finally {
      setDownloadingBadge(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(t("confirm.copied"));
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t("confirm.copied"));
  };

  const uploadReceipt = async (file: File) => {
    if (!booking) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${booking.tracking_code}-${Date.now()}.${ext}`;
      const url = await api.storage.upload("receipts", path, file, file.type);
      await api.bookings.attachReceipt(booking.tracking_code, url);
      setBooking({ ...booking, receipt_url: url });
      toast.success(t("track.upload.success"));
    } catch (e) {
      console.error(e);
      toast.error(t("booking.error"));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("track.title")} description="Suivi de réservation Alfarouk Voyage." noIndex />
        <Header />
        <div className="container py-32 text-center text-muted-foreground">…</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("track.title")} description="Suivi de réservation Alfarouk Voyage." noIndex />
        <Header />
        <div className="container py-32 text-center">
          <p className="text-muted-foreground mb-4">{t("track.notFound")}</p>
          <Link to="/" className="text-primary hover:underline">{t("cta.back")}</Link>
        </div>
      </div>
    );
  }

  const statusConfig = {
    awaiting_payment: { icon: Clock3, color: "warning", label: t("track.status.awaiting_payment") },
    confirmed: { icon: CheckCircle2, color: "success", label: t("track.status.confirmed") },
    cancelled: { icon: XCircle, color: "destructive", label: t("track.status.cancelled") },
  }[booking.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t("track.title")} ${code}`}
        description={`Suivi de la réservation ${code} — Alfarouk Voyage.`}
        noIndex
      />
      <Header />
      <main className="container py-8 md:py-12 max-w-3xl print:py-0 print:max-w-none">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 print:hidden"
        >
          <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          {t("cta.back")}
        </Link>

        {justConfirmed && (
          <div className="mb-6 rounded-3xl bg-success/10 border border-success/30 p-6 animate-float-up print:hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success text-white flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{t("confirm.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("confirm.sub")}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-foreground/80">{t("confirm.bookmark")}</p>
          </div>
        )}

        {/* Receipt card */}
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft print:shadow-none print:border-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary mb-2">
                {t("confirm.code")}
              </div>
              <div className="font-display text-2xl md:text-3xl font-semibold tracking-wide">
                {booking.tracking_code}
              </div>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                statusConfig.color === "success" ? "bg-success/10 text-success" :
                statusConfig.color === "warning" ? "bg-warning/10 text-warning" :
                "bg-destructive/10 text-destructive"
              }`}
            >
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Row label={t("track.passenger")} value={booking.full_name} />
            <Row
              label={t("track.voyage")}
              value={`${booking.voyage_name} · ${booking.travelers}p`}
            />
            <Row
              label={<span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{t("booking.phone1")}</span>}
              value={booking.phone_primary}
            />
            {booking.phone_secondary && (
              <Row label={t("booking.phone2")} value={booking.phone_secondary} />
            )}
            <Row
              label={<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{t("track.location")}</span>}
              value={`${booking.baladya}, ${booking.daira}, ${booking.wilaya}`}
            />
            <Row label="Point" value={booking.pickup_point} />
          </div>

          <div className="mt-6 pt-6 border-t border-border flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t("booking.total")}</span>
            <span className="font-display text-2xl font-semibold">
              {formatDzd(booking.total_dzd, lang)}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 print:hidden">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary-deep transition-colors"
            >
              <Copy className="h-4 w-4" />
              {t("confirm.copyLink")}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Printer className="h-4 w-4" />
              {t("confirm.print")}
            </button>
          </div>
        </div>

        {/* QR check-in card */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-2">
                <QrCode className="h-3.5 w-3.5" />
                {t("track.qr.title")}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("track.qr.help")}
              </p>
              {booking.checked_in_at && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/10 text-success px-3 py-1.5 text-xs font-medium">
                  <Check className="h-3.5 w-3.5" />
                  {t("track.checkedIn")} · {new Date(booking.checked_in_at).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")}
                </div>
              )}
              <button
                onClick={handleDownloadBadge}
                disabled={downloadingBadge}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary-deep disabled:opacity-60 transition-colors print:hidden"
              >
                {downloadingBadge ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t("badge.download")}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">{t("badge.help")}</p>
            </div>
            {qrUrl && (
              <div className="rounded-2xl bg-white p-3 shadow-soft">
                <img src={qrUrl} alt="QR" width={180} height={180} className="block" />
              </div>
            )}
          </div>
        </div>


        {/* Payment */}
        {booking.status === "awaiting_payment" && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft print:hidden">
            <h2 className="font-display text-xl font-semibold">{t("track.payment.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("track.payment.body")}
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <PayCard
                label={t("track.payment.baridi")}
                value={AGENCY.baridiMob}
                onCopy={() => copyText(AGENCY.baridiMob)}
                copyLabel={t("track.payment.copy")}
              />
              <PayCard
                label={t("track.payment.ccp")}
                value={AGENCY.ccp}
                sub={AGENCY.ccpName}
                onCopy={() => copyText(AGENCY.ccp)}
                copyLabel={t("track.payment.copy")}
              />
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-3">{t("track.upload.title")}</h3>
              {booking.receipt_url ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-success/10 text-success px-4 py-2 text-sm">
                  <Check className="h-4 w-4" />
                  <a href={booking.receipt_url} target="_blank" rel="noreferrer" className="underline">
                    {t("track.upload.success")}
                  </a>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-medium cursor-pointer hover:bg-primary-deep transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? "…" : t("track.upload.cta")}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadReceipt(f);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const Row = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
    <div className="font-medium text-foreground">{value}</div>
  </div>
);

const PayCard = ({
  label,
  value,
  sub,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  onCopy: () => void;
  copyLabel: string;
}) => (
  <div className="rounded-2xl border border-border bg-secondary/40 p-4">
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-1 font-mono text-base font-medium break-all" dir="ltr">{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    <button
      onClick={onCopy}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs hover:bg-background transition-colors"
    >
      <Copy className="h-3 w-3" />
      {copyLabel}
    </button>
  </div>
);

export default Track;
