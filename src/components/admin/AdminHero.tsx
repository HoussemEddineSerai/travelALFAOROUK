import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Save,
  Smartphone,
  Monitor,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Sparkles,
  Type as TypeIcon,
} from "lucide-react";
import { api } from "@/services/api";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Loader";
import defaultHero from "@/assets/hero-sahara.jpg";
import {
  HERO_DEFAULTS,
  type HeroConfig,
  type HeroGradientStyle,
  type HeroTextAlign,
} from "@/lib/siteSettings";
import { heroAlignClasses, heroGradientClass } from "@/lib/heroStyles";

const SETTING_KEY = "hero_image";

type PreviewMode = "desktop" | "mobile";

export const AdminHero = () => {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";

  const [cfg, setCfg] = useState<HeroConfig>({ ...HERO_DEFAULTS });
  const [initial, setInitial] = useState<HeroConfig>({ ...HERO_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewMode>("desktop");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const v = (await api.siteSettings.get<HeroConfig>(SETTING_KEY)) ?? ({} as HeroConfig);
    const merged: HeroConfig = {
      url: v.url,
      overlayOpacity:
        typeof v.overlayOpacity === "number" ? v.overlayOpacity : HERO_DEFAULTS.overlayOpacity,
      gradientStyle: v.gradientStyle ?? HERO_DEFAULTS.gradientStyle,
      textAlign: v.textAlign ?? HERO_DEFAULTS.textAlign,
      text: {
        fr: { ...(v.text?.fr ?? {}) },
        ar: { ...(v.text?.ar ?? {}) },
      },
    };
    setCfg(merged);
    setInitial(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(cfg) !== JSON.stringify(initial),
    [cfg, initial],
  );

  const persist = async (next: HeroConfig, opts?: { silent?: boolean }) => {
    setSaving(true);
    try {
      const sess = await api.auth.getSession();
      await api.siteSettings.set(SETTING_KEY, next, sess?.userId ?? null);
      setInitial(next);
      if (!opts?.silent) {
        toast.success(isAr ? "تم الحفظ" : "Modifications enregistrées");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(isAr ? "الرجاء اختيار صورة" : "Veuillez choisir une image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(isAr ? "الصورة كبيرة جدًا (حد أقصى 8 ميجابايت)" : "Image trop volumineuse (max 8 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `hero-${Date.now()}.${ext}`;
      const publicUrl = await api.storage.upload("site-assets", path, file, file.type);
      const next: HeroConfig = { ...cfg, url: publicUrl };
      setCfg(next);
      await persist(next, { silent: true });
      toast.success(isAr ? "تم تحديث الصورة" : "Photo mise à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetImage = async () => {
    if (!confirm(isAr ? "استعادة الصورة الافتراضية؟" : "Restaurer la photo par défaut ?")) return;
    const next: HeroConfig = { ...cfg, url: undefined };
    setCfg(next);
    await persist(next);
  };

  const resetAll = () => {
    setCfg({ url: cfg.url, ...HERO_DEFAULTS });
  };

  const previewSrc = cfg.url || defaultHero;
  const isDefaultImage = !cfg.url;
  const overlay = heroGradientClass(
    cfg.gradientStyle ?? HERO_DEFAULTS.gradientStyle,
    cfg.overlayOpacity ?? HERO_DEFAULTS.overlayOpacity,
  );
  const align = heroAlignClasses(cfg.textAlign ?? HERO_DEFAULTS.textAlign);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {isAr ? "تخصيص الواجهة" : "Personnaliser la page d'accueil"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {isAr
              ? "اختر صورة الواجهة وعدّل التعتيم والتدرج ومحاذاة النص لقراءة أفضل على الهاتف ودعم RTL."
              : "Modifiez la photo, l'opacité du voile, le style de dégradé et l'alignement du texte pour une lecture optimale sur mobile et en RTL."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-background text-sm hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" />
              {isAr ? "إلغاء" : "Annuler"}
            </button>
          )}
          <button
            onClick={() => persist(cfg)}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-deep shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            {isAr ? "حفظ التعديلات" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Preview */}
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-soft">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
              {isAr ? "معاينة مباشرة" : "Aperçu en direct"}
            </div>
            <div className="inline-flex items-center bg-card border border-border rounded-full p-1">
              <PreviewTab
                active={preview === "desktop"}
                onClick={() => setPreview("desktop")}
                icon={<Monitor className="h-3.5 w-3.5" />}
                label={isAr ? "حاسوب" : "Bureau"}
              />
              <PreviewTab
                active={preview === "mobile"}
                onClick={() => setPreview("mobile")}
                icon={<Smartphone className="h-3.5 w-3.5" />}
                label={isAr ? "هاتف" : "Mobile"}
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-secondary/30">
            <div
              className={`mx-auto transition-all duration-300 ${
                preview === "mobile" ? "max-w-[360px]" : "max-w-full"
              }`}
            >
              <div
                className="relative overflow-hidden rounded-2xl shadow-card"
                dir={isAr ? "rtl" : "ltr"}
              >
                {loading ? (
                  <div className="aspect-[16/10] flex items-center justify-center bg-secondary">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <>
                    <img
                      src={previewSrc}
                      alt="Hero preview"
                      className={`w-full object-cover ${
                        preview === "mobile" ? "aspect-[9/14]" : "aspect-[16/9]"
                      }`}
                    />
                    {/* tint */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: `rgba(0,0,0,${overlay.tintAlpha})` }}
                    />
                    {overlay.gradients.map((bg, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundImage: bg }}
                      />
                    ))}
                    {/* Mock content */}
                    <div className="absolute inset-0 flex flex-col p-4 sm:p-6">
                      <div className={`flex ${align.ctaRow}`}>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/15 backdrop-blur px-2.5 py-1 text-paper/90 text-[9px] tracking-[0.2em] uppercase">
                          <Sparkles className="h-2.5 w-2.5" />
                          {isAr ? "وجهات مختارة" : "Voyages d'auteur"}
                        </span>
                      </div>
                      <div className={`flex-1 flex ${align.wrapper}`}>
                        <div className={`max-w-md ${align.inner}`}>
                          <div
                            className={`font-display text-paper font-semibold leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.4)] ${
                              preview === "mobile" ? "text-2xl" : "text-3xl sm:text-4xl"
                            }`}
                          >
                            {isAr ? "اكتشف الجزائر" : "Évadez-vous"}
                            <br />
                            <span className="italic font-light text-paper/95">
                              {isAr ? "بأناقة" : "autrement"}
                            </span>
                          </div>
                          <div className="mt-2 text-paper/85 text-xs sm:text-sm drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
                            {isAr
                              ? "رحلات استثنائية في الصحراء والسواحل."
                              : "Des escapades sur mesure, du désert au littoral."}
                          </div>
                          <div className={`mt-3 flex flex-wrap items-center gap-2 ${align.ctaRow}`}>
                            <span className="inline-flex items-center rounded-full bg-paper text-ink px-3 py-1.5 text-[11px] font-medium">
                              {isAr ? "ابدأ الآن" : "Découvrir"}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-paper/40 bg-paper/10 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-paper">
                              {isAr ? "المزيد" : "En savoir plus"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status chip */}
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur px-2.5 py-1 text-[10px] font-medium shadow-soft">
                      {isDefaultImage ? (
                        <>
                          <ImageIcon className="h-3 w-3 text-muted-foreground" />
                          {isAr ? "افتراضي" : "Par défaut"}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-success" />
                          {isAr ? "مخصصة" : "Personnalisée"}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Hero text (FR + AR) */}
          <Panel
            title={isAr ? "نص الواجهة" : "Texte de la page d'accueil"}
            description={
              isAr
                ? "حرّر العنوان والعنوان الفرعي بالعربية والفرنسية. اترك الحقل فارغاً لاستخدام النص الافتراضي."
                : "Modifiez le titre, l'accroche et le sous-titre en FR et AR. Laissez vide pour conserver la valeur par défaut."
            }
            icon={<TypeIcon className="h-4 w-4" />}
          >
            <HeroTextEditor
              cfg={cfg}
              onChange={(text) => setCfg((c) => ({ ...c, text }))}
              isAr={isAr}
            />
          </Panel>

          {/* Image */}
          <Panel
            title={isAr ? "الصورة" : "Photo"}
            description={isAr ? "PNG / JPG / WEBP — حتى 8 ميجابايت" : "PNG / JPG / WEBP — max 8 Mo"}
          >
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-ink text-paper text-sm font-medium hover:bg-primary transition-colors disabled:opacity-60"
              >
                {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
                {isAr ? "تحميل صورة جديدة" : "Téléverser une image"}
              </button>
              {!isDefaultImage && (
                <button
                  onClick={resetImage}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-border bg-background text-sm hover:bg-secondary"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isAr ? "استعادة الافتراضية" : "Restaurer par défaut"}
                </button>
              )}
            </div>
          </Panel>

          {/* Overlay opacity */}
          <Panel
            title={isAr ? "تعتيم الطبقة" : "Opacité du voile"}
            description={
              isAr
                ? "كلما زاد التعتيم زادت قابلية قراءة النص."
                : "Plus l'opacité est forte, plus le texte est lisible."
            }
            icon={<Sun className="h-4 w-4" />}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={cfg.overlayOpacity ?? HERO_DEFAULTS.overlayOpacity}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, overlayOpacity: Number(e.target.value) }))
                }
                className="flex-1 accent-primary"
              />
              <span className="text-sm tabular-nums w-10 text-end font-medium">
                {cfg.overlayOpacity ?? HERO_DEFAULTS.overlayOpacity}%
              </span>
            </div>
          </Panel>

          {/* Gradient style */}
          <Panel title={isAr ? "نمط التدرج" : "Style de dégradé"}>
            <div className="grid grid-cols-2 gap-2">
              <GradientChip
                active={(cfg.gradientStyle ?? "vignette") === "vignette"}
                onClick={() => setCfg((c) => ({ ...c, gradientStyle: "vignette" }))}
                label={isAr ? "محيطي" : "Vignette"}
                preview="radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)"
              />
              <GradientChip
                active={cfg.gradientStyle === "bottom"}
                onClick={() => setCfg((c) => ({ ...c, gradientStyle: "bottom" }))}
                label={isAr ? "من الأسفل" : "Bas"}
                preview="linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 70%)"
              />
              <GradientChip
                active={cfg.gradientStyle === "side"}
                onClick={() => setCfg((c) => ({ ...c, gradientStyle: "side" }))}
                label={isAr ? "جانبي" : "Côté"}
                preview="linear-gradient(to right, rgba(0,0,0,0.85) 0%, transparent 60%)"
              />
              <GradientChip
                active={cfg.gradientStyle === "none"}
                onClick={() => setCfg((c) => ({ ...c, gradientStyle: "none" }))}
                label={isAr ? "بدون" : "Aucun"}
                preview="transparent"
              />
            </div>
          </Panel>

          {/* Text alignment */}
          <Panel
            title={isAr ? "محاذاة النص" : "Alignement du texte"}
            description={
              isAr
                ? "تتكيّف تلقائيًا مع الاتجاه (RTL/LTR)."
                : "S'adapte automatiquement à la direction (RTL/LTR)."
            }
          >
            <div className="grid grid-cols-3 gap-2">
              <AlignChip
                active={(cfg.textAlign ?? "start") === "start"}
                onClick={() => setCfg((c) => ({ ...c, textAlign: "start" }))}
                icon={<AlignLeft className="h-4 w-4 rtl:scale-x-[-1]" />}
                label={isAr ? "بداية" : "Début"}
              />
              <AlignChip
                active={cfg.textAlign === "center"}
                onClick={() => setCfg((c) => ({ ...c, textAlign: "center" }))}
                icon={<AlignCenter className="h-4 w-4" />}
                label={isAr ? "وسط" : "Centre"}
              />
              <AlignChip
                active={cfg.textAlign === "end"}
                onClick={() => setCfg((c) => ({ ...c, textAlign: "end" }))}
                icon={<AlignRight className="h-4 w-4 rtl:scale-x-[-1]" />}
                label={isAr ? "نهاية" : "Fin"}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

const Panel = ({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
    <div className="flex items-start gap-2 mb-3">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
    </div>
    {children}
  </div>
);

const PreviewTab = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-medium transition-colors ${
      active
        ? "bg-ink text-paper shadow-soft"
        : "text-muted-foreground hover:text-foreground"
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const GradientChip = ({
  active,
  onClick,
  label,
  preview,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  preview: string;
}) => (
  <button
    onClick={onClick}
    className={`group relative h-16 rounded-xl border overflow-hidden transition-all ${
      active
        ? "border-primary ring-2 ring-primary/30 shadow-soft"
        : "border-border hover:border-foreground/30"
    }`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-orange-300 to-rose-400" />
    <div className="absolute inset-0" style={{ backgroundImage: preview }} />
    <div className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] font-medium text-paper bg-gradient-to-t from-black/60 to-transparent text-start">
      {label}
    </div>
    {active && (
      <div className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckCircle2 className="h-3 w-3" />
      </div>
    )}
  </button>
);

const AlignChip = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 h-16 rounded-xl border transition-all ${
      active
        ? "border-primary bg-primary/5 ring-2 ring-primary/30 text-foreground"
        : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
    }`}
  >
    {icon}
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const FR_DEFAULTS = {
  eyebrow: "Excursions & Circuits Organisés",
  title1: "L'Algérie vous appelle.",
  title2: "Répondez en beauté.",
  subtitle:
    "Des dunes du Tassili aux ruines romaines de Tipaza — composez votre voyage en 30 secondes, sans création de compte.",
};
const AR_DEFAULTS = {
  eyebrow: "رحلات وجولات منظمة",
  title1: "الجزائر تناديك.",
  title2: "أجب بكل جمال.",
  subtitle: "من كثبان الطاسيلي إلى آثار تيبازة الرومانية — احجز رحلتك في 30 ثانية، دون إنشاء حساب.",
};

const HeroTextEditor = ({
  cfg,
  onChange,
  isAr,
}: {
  cfg: HeroConfig;
  onChange: (text: NonNullable<HeroConfig["text"]>) => void;
  isAr: boolean;
}) => {
  const [tab, setTab] = useState<"fr" | "ar">(isAr ? "ar" : "fr");
  const current = cfg.text?.[tab] ?? {};
  const defaults = tab === "fr" ? FR_DEFAULTS : AR_DEFAULTS;
  const dir = tab === "ar" ? "rtl" : "ltr";

  const set = (patch: Partial<typeof current>) => {
    onChange({
      fr: cfg.text?.fr ?? {},
      ar: cfg.text?.ar ?? {},
      [tab]: { ...current, ...patch },
    });
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all";

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center bg-secondary rounded-full p-1">
        <button
          onClick={() => setTab("fr")}
          className={`px-3.5 h-7 rounded-full text-[11px] font-medium transition-colors ${
            tab === "fr" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🇫🇷 Français
        </button>
        <button
          onClick={() => setTab("ar")}
          className={`px-3.5 h-7 rounded-full text-[11px] font-medium transition-colors ${
            tab === "ar" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🇩🇿 العربية
        </button>
      </div>

      <FieldRow label={isAr ? "العنوان العلوي" : "Eyebrow"}>
        <input
          dir={dir}
          value={current.eyebrow ?? ""}
          placeholder={defaults.eyebrow}
          onChange={(e) => set({ eyebrow: e.target.value })}
          className={inputCls}
        />
      </FieldRow>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FieldRow label={isAr ? "العنوان (سطر 1)" : "Titre (ligne 1)"}>
          <input
            dir={dir}
            value={current.title1 ?? ""}
            placeholder={defaults.title1}
            onChange={(e) => set({ title1: e.target.value })}
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label={isAr ? "العنوان (سطر 2)" : "Titre (ligne 2)"}>
          <input
            dir={dir}
            value={current.title2 ?? ""}
            placeholder={defaults.title2}
            onChange={(e) => set({ title2: e.target.value })}
            className={inputCls}
          />
        </FieldRow>
      </div>
      <FieldRow label={isAr ? "النص الفرعي" : "Sous-titre"}>
        <textarea
          dir={dir}
          value={current.subtitle ?? ""}
          placeholder={defaults.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
          rows={3}
          className={inputCls + " resize-none leading-relaxed"}
        />
      </FieldRow>
      <p className="text-[11px] text-muted-foreground">
        {isAr
          ? "اترك الحقل فارغاً لاستخدام النص الافتراضي المعروض كـ placeholder."
          : "Laissez vide pour conserver le texte par défaut affiché en placeholder."}
      </p>
    </div>
  );
};

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
      {label}
    </div>
    {children}
  </div>
);

export default AdminHero;
