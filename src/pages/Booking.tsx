import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, AlertCircle, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchVoyageBySlug, type Voyage } from "@/data/voyages";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { formatDzd } from "@/lib/format";
import { generateTrackingCode } from "@/lib/agency";
import { api } from "@/services/api";
import { toast } from "sonner";

const Booking = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [voyage, setVoyage] = useState<Voyage | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    fetchVoyageBySlug(slug).then(setVoyage).catch(() => setVoyage(null));
  }, [slug]);

  const [step, setStep] = useState(1);
  const [travelers, setTravelers] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [wilayaName, setWilaya] = useState("");
  const [dairaName, setDaira] = useState("");
  const [baladyaName, setBaladya] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [pickup, setPickup] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blacklistError, setBlacklistError] = useState(false);

  // Booking flow is private (per user) → no public title needed; SEO component below sets noIndex.


  // Localisation: free-text inputs (no dropdowns) — let the client type their own wilaya/daira/baladya.

  if (voyage === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("booking.title")} description="Réservez votre voyage avec Alfarouk Voyage." noIndex />
        <Header />
        <div className="container py-32 text-center text-muted-foreground">…</div>
      </div>
    );
  }

  if (!voyage) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={t("booking.title")} description="Réservez votre voyage avec Alfarouk Voyage." noIndex />
        <Header />
        <div className="container py-32 text-center">
          <Link to="/" className="text-primary hover:underline">{t("cta.back")}</Link>
        </div>
      </div>
    );
  }

  const total = voyage.priceDzd * travelers;

  const canNext = () => {
    if (step === 1) return travelers >= 1;
    if (step === 2) return fullName.trim().length >= 2 && /^\d{8,15}$/.test(phone1.replace(/\s/g, "")) && (!phone2 || /^\d{8,15}$/.test(phone2.replace(/\s/g, "")));
    if (step === 3) return wilayaName.trim().length >= 2 && dairaName.trim().length >= 2 && baladyaName.trim().length >= 2 && (!pickupEnabled || pickup.trim().length >= 3);
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    setBlacklistError(false);

    try {
      // Blacklist check
      const cleaned1 = phone1.replace(/\s/g, "");
      const cleaned2 = phone2.replace(/\s/g, "");
      const blacklisted = await api.blacklist.isBlacklisted(
        cleaned2 ? [cleaned1, cleaned2] : [cleaned1],
      );
      if (blacklisted) {
        setBlacklistError(true);
        setSubmitting(false);
        return;
      }

      const tracking_code = generateTrackingCode();

      // Upload voice note if present
      let voice_note_url: string | null = null;
      if (voiceBlob) {
        try {
          voice_note_url = await api.storage.upload(
            "voice-notes",
            `${tracking_code}.webm`,
            voiceBlob,
            "audio/webm",
          );
        } catch (e) {
          console.warn("voice note upload failed", e);
        }
      }

      await api.bookings.create({
        tracking_code,
        voyage_slug: voyage.slug,
        voyage_name: voyage.name.fr,
        full_name: fullName.trim(),
        phone_primary: cleaned1,
        phone_secondary: cleaned2 || null,
        travelers,
        wilaya: wilayaName,
        daira: dairaName,
        baladya: baladyaName,
        pickup_point: pickupEnabled && pickup.trim() ? pickup.trim() : "",
        voice_note_url,
        total_dzd: total,
      });

      nav(`/track/${tracking_code}?confirmed=1`);
    } catch (e) {
      console.error(e);
      toast.error(t("booking.error"));
      setSubmitting(false);
    }
  };

  const steps = [t("booking.step1"), t("booking.step2"), t("booking.step3"), t("booking.step4")];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t("booking.title")} — ${voyage.name[lang]}`}
        description={`Réservez ${voyage.name[lang]} avec Alfarouk Voyage — ${voyage.days} jours.`}
        path={`/book/${voyage.slug}`}
        noIndex
      />
      <Header />
      <main className="container py-8 md:py-12">
        <Link
          to={`/voyage/${voyage.slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          {t("cta.back")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">
          <div>
            {/* Stepper */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">
                {t("booking.step")} {step} {t("booking.of")} 4
              </div>
              <div className="flex gap-2">
                {steps.map((label, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        i + 1 <= step ? "bg-primary" : "bg-border"
                      }`}
                    />
                    <div className="mt-2 text-[11px] text-muted-foreground hidden sm:block">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-semibold mb-6">
              {steps[step - 1]}
            </h1>

            <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-5">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t("booking.travelers")}
                    </label>
                    <div className="inline-flex items-center rounded-full border border-border overflow-hidden">
                      <button
                        type="button"
                        className="px-5 py-3 hover:bg-secondary"
                        onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      >
                        −
                      </button>
                      <span className="px-6 py-3 font-medium tabular-nums min-w-[60px] text-center">
                        {travelers}
                      </span>
                      <button
                        type="button"
                        className="px-5 py-3 hover:bg-secondary"
                        onClick={() => setTravelers(Math.min(20, travelers + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <>
                  <Field label={t("booking.fullName")}>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("booking.fullName.ph")}
                      className="input-field"
                    />
                  </Field>
                  <Field label={t("booking.phone1")}>
                    <input
                      type="tel"
                      value={phone1}
                      onChange={(e) => setPhone1(e.target.value)}
                      placeholder={t("booking.phone.ph")}
                      className="input-field"
                      dir="ltr"
                    />
                  </Field>
                  <Field
                    label={t("booking.phone2")}
                    help={t("booking.phone2.help")}
                  >
                    <input
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder={t("booking.phone.ph")}
                      className="input-field"
                      dir="ltr"
                    />
                  </Field>
                  {blacklistError && (
                    <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{t("booking.blacklisted")}</span>
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <Field label={t("booking.wilaya")}>
                    <input
                      type="text"
                      value={wilayaName}
                      onChange={(e) => setWilaya(e.target.value)}
                      placeholder={lang === "ar" ? "مثال: الجزائر" : "Ex. Alger"}
                      className="input-field"
                      maxLength={80}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={t("booking.daira")}>
                    <input
                      type="text"
                      value={dairaName}
                      onChange={(e) => setDaira(e.target.value)}
                      placeholder={lang === "ar" ? "مثال: حسين داي" : "Ex. Hussein Dey"}
                      className="input-field"
                      maxLength={80}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={t("booking.baladya")}>
                    <input
                      type="text"
                      value={baladyaName}
                      onChange={(e) => setBaladya(e.target.value)}
                      placeholder={lang === "ar" ? "مثال: القبة" : "Ex. Kouba"}
                      className="input-field"
                      maxLength={80}
                      autoComplete="off"
                    />
                  </Field>

                  {/* Pickup point — checkbox toggle */}
                  <div className="rounded-2xl border border-border bg-background/50 p-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pickupEnabled}
                        onChange={(e) => {
                          setPickupEnabled(e.target.checked);
                          if (!e.target.checked) setPickup("");
                        }}
                        className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/30 cursor-pointer accent-[hsl(var(--primary))]"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {t("booking.pickup")}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {lang === "ar"
                            ? "فعّل الخيار إذا كنت تحتاج نقطة تحميل محددة."
                            : "Activez si vous souhaitez préciser un point de prise en charge."}
                        </span>
                      </span>
                    </label>

                    {pickupEnabled && (
                      <div className="relative animate-fade-in">
                        <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          placeholder={t("booking.pickup.ph")}
                          className="input-field ps-9"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">{t("booking.voice.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("booking.voice.help")}
                    </p>
                  </div>
                  <VoiceRecorder onChange={setVoiceBlob} />
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium border border-border bg-card hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
                {t("cta.previous")}
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => canNext() && setStep(step + 1)}
                  disabled={!canNext()}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("cta.continue")}
                  <ArrowRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-deep disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  {submitting ? "…" : t("cta.confirm")}
                </button>
              )}
            </div>
          </div>

          {/* Summary — desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">
                {t("booking.summary")}
              </div>
              <img
                src={voyage.image}
                alt=""
                className="w-full h-32 object-cover rounded-2xl mb-4"
              />
              <h3 className="font-display text-lg font-semibold leading-tight">
                {voyage.name[lang]}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {voyage.region[lang]} · {voyage.days} {t("voyage.days")}
              </p>

              <div className="mt-5 pt-5 border-t border-border space-y-2 text-sm">
                <Row label={`${formatDzd(voyage.priceDzd, lang)} × ${travelers}`} value="" />
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t("booking.total")}</span>
                <span className="font-display text-2xl font-semibold">
                  {formatDzd(total, lang)}
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile sticky total — always visible at the bottom */}
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md shadow-card"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="container py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("booking.total")}
              </div>
              <div className="font-display text-lg font-semibold tabular-nums leading-tight">
                {formatDzd(total, lang)}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate max-w-[40%] text-end">
              {voyage.name[lang]} · {travelers} {lang === "ar" ? "مسافر" : "pers."}
            </div>
          </div>
        </div>
      </main>
      {/* Spacer so footer / form aren't hidden behind the sticky bar on mobile */}
      <div className="lg:hidden h-20" aria-hidden />
      <Footer />

      <style>{`
        .input-field {
          width: 100%;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .input-field:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.12);
        }
      `}</style>
    </div>
  );
};

const Field = ({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-sm font-medium mb-2">{label}</label>
    {children}
    {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-foreground/80">
    <span>{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Booking;
