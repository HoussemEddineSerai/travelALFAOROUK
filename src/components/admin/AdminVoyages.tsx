import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Edit3, Eye, EyeOff, Upload, X, GripVertical, MapPin, Globe2, CheckSquare, Search, Camera, ChevronUp, ChevronDown } from "lucide-react";
import { api, type VoyagePhoto } from "@/services/api";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";
import { formatDzd } from "@/lib/format";
import { wilayas } from "@/data/wilayas";

type Kind = "excursion" | "organise";

interface ItineraryDay {
  day: number;
  title: { fr: string; ar: string };
  body: { fr: string; ar: string };
}

interface IncludedItem { fr: string; ar: string }

interface VoyageRow {
  id: string;
  slug: string;
  kind: Kind;
  region_fr: string; region_ar: string; region_en: string;
  name_fr: string; name_ar: string; name_en: string;
  tagline_fr: string; tagline_ar: string; tagline_en: string;
  description_fr: string; description_ar: string; description_en: string;
  country_fr: string; country_ar: string;
  wilaya: string; daira: string; commune: string;
  image_url: string;
  days: number;
  price_dzd: number;
  itinerary: ItineraryDay[];
  included: IncludedItem[];
  published: boolean;
  sort_order: number;
}

const emptyVoyage = (kind: Kind): VoyageRow => ({
  id: "",
  slug: "",
  kind,
  region_fr: "", region_ar: "", region_en: "",
  name_fr: "", name_ar: "", name_en: "",
  tagline_fr: "", tagline_ar: "", tagline_en: "",
  description_fr: "", description_ar: "", description_en: "",
  country_fr: "", country_ar: "",
  wilaya: "", daira: "", commune: "",
  image_url: "",
  days: 1,
  price_dzd: 0,
  itinerary: [],
  included: [],
  published: true,
  sort_order: 0,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const normalizeItinerary = (raw: unknown): ItineraryDay[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((d, i) => {
    const day = (d as { day?: number })?.day ?? i + 1;
    const t = (d as { title?: unknown })?.title;
    const b = (d as { body?: unknown })?.body;
    const titleObj = typeof t === "object" && t ? t as Record<string, string> : {};
    const bodyObj = typeof b === "object" && b ? b as Record<string, string> : {};
    return {
      day,
      title: { fr: titleObj.fr || "", ar: titleObj.ar || "" },
      body: { fr: bodyObj.fr || "", ar: bodyObj.ar || "" },
    };
  });
};

const normalizeIncluded = (raw: unknown): IncludedItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => {
    if (typeof it === "string") return { fr: it, ar: it };
    const o = (it || {}) as Record<string, unknown>;
    return { fr: String(o.fr || ""), ar: String(o.ar || "") };
  });
};

const DEFAULT_INCLUDED: IncludedItem[] = [
  { fr: "Transport climatisé aller-retour", ar: "النقل المكيف ذهاباً وإياباً" },
  { fr: "Guide local francophone certifié", ar: "مرشد محلي معتمد" },
  { fr: "Hébergement en pension complète", ar: "إقامة بإقامة كاملة" },
  { fr: "Toutes les activités du programme", ar: "جميع الأنشطة المبرمجة" },
  { fr: "Assurance voyage incluse", ar: "تأمين السفر" },
];

export const AdminVoyages = () => {
  const { t } = useI18n();
  const [list, setList] = useState<VoyageRow[]>([]);
  const [editing, setEditing] = useState<VoyageRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState<Kind>("excursion");
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const data = await api.voyages.list({ includeUnpublished: true });
      // The api.voyages.list() returns Voyage objects (mapped). For the admin
      // editor we need the raw row shape (per-language fields). Map back.
      const rows: VoyageRow[] = data.map((v) => ({
        id: v.id,
        slug: v.slug,
        kind: v.kind as Kind,
        region_fr: v.region.fr, region_ar: v.region.ar, region_en: v.region.en,
        name_fr: v.name.fr, name_ar: v.name.ar, name_en: v.name.en,
        tagline_fr: v.tagline.fr, tagline_ar: v.tagline.ar, tagline_en: v.tagline.en,
        description_fr: v.description.fr, description_ar: v.description.ar, description_en: v.description.en,
        country_fr: v.country.fr, country_ar: v.country.ar,
        wilaya: v.wilaya, daira: v.daira, commune: v.commune,
        image_url: v.image,
        days: v.days,
        price_dzd: v.priceDzd,
        itinerary: normalizeItinerary(v.itinerary as unknown),
        included: normalizeIncluded(v.included as unknown),
        published: v.published,
        sort_order: v.sortOrder,
      }));
      setList(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let l = list.filter((v) => v.kind === subTab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      l = l.filter((v) =>
        [v.name_fr, v.name_ar, v.slug, v.wilaya, v.daira, v.commune, v.country_fr, v.country_ar]
          .filter(Boolean).join(" ").toLowerCase().includes(q),
      );
    }
    return l;
  }, [list, subTab, search]);

  const togglePublish = async (v: VoyageRow) => {
    try {
      await api.voyages.setPublished(v.id, !v.published);
      setList((l) => l.map((x) => x.id === v.id ? { ...x, published: !v.published } : x));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (v: VoyageRow) => {
    if (!confirm(t("admin.voyage.confirmDelete"))) return;
    try {
      await api.voyages.remove(v.id);
      setList((l) => l.filter((x) => x.id !== v.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const uploadImage = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${editing.slug || crypto.randomUUID()}-${Date.now()}.${ext}`;
      const url = await api.storage.upload("voyage-images", path, file, file.type);
      setEditing({ ...editing, image_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const slug = editing.slug || slugify(editing.name_fr);
      // Compose region from kind-specific fields when empty
      const autoRegionFr = editing.kind === "excursion"
        ? [editing.wilaya, editing.daira].filter(Boolean).join(" · ")
        : editing.country_fr;
      const autoRegionAr = editing.kind === "excursion"
        ? [editing.wilaya, editing.daira].filter(Boolean).join(" · ")
        : editing.country_ar;

      const payload = {
        slug,
        kind: editing.kind,
        region_fr: editing.region_fr || autoRegionFr,
        region_ar: editing.region_ar || autoRegionAr,
        region_en: editing.region_fr || autoRegionFr,
        name_fr: editing.name_fr,
        name_ar: editing.name_ar,
        name_en: editing.name_fr,
        tagline_fr: editing.tagline_fr,
        tagline_ar: editing.tagline_ar,
        tagline_en: editing.tagline_fr,
        description_fr: editing.description_fr,
        description_ar: editing.description_ar,
        description_en: editing.description_fr,
        country_fr: editing.country_fr,
        country_ar: editing.country_ar,
        wilaya: editing.wilaya,
        daira: editing.daira,
        commune: editing.commune,
        image_url: editing.image_url,
        days: editing.days,
        price_dzd: editing.price_dzd,
        itinerary: editing.itinerary.map((d, i) => ({
          day: i + 1,
          title: { fr: d.title.fr, ar: d.title.ar, en: d.title.fr },
          body: { fr: d.body.fr, ar: d.body.ar, en: d.body.fr },
        })) as never,
        included: editing.included
          .filter((it) => it.fr.trim() || it.ar.trim())
          .map((it) => ({ fr: it.fr.trim(), ar: it.ar.trim() })) as never,
        published: editing.published,
        sort_order: editing.sort_order,
      };
      await api.voyages.upsert({ ...(editing.id ? { id: editing.id } : {}), ...payload });
      toast.success("✓");
      setEditing(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Itinerary helpers
  const addDay = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      itinerary: [
        ...editing.itinerary,
        { day: editing.itinerary.length + 1, title: { fr: "", ar: "" }, body: { fr: "", ar: "" } },
      ],
    });
  };
  const removeDay = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, itinerary: editing.itinerary.filter((_, i) => i !== idx) });
  };
  const updateDay = (idx: number, patch: Partial<ItineraryDay>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      itinerary: editing.itinerary.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    });
  };

  // Cascading lists for excursion
  const wilayaObj = wilayas.find((w) => w.name === editing?.wilaya);
  const dairas = wilayaObj?.dairas || [];
  const dairaObj = dairas.find((d) => d.name === editing?.daira);
  const communes = dairaObj?.baladyas || [];

  return (
    <>
      {/* Toolbar: tabs + search + new */}
      <div className="rounded-2xl border border-border bg-card p-3 md:p-4 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-secondary p-1 shrink-0">
            <button
              onClick={() => setSubTab("excursion")}
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs rounded-full font-medium transition-colors ${
                subTab === "excursion" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("admin.voyage.tab.excursions")}
              <span className="ms-1 text-[10px] opacity-70">{list.filter((v) => v.kind === "excursion").length}</span>
            </button>
            <button
              onClick={() => setSubTab("organise")}
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs rounded-full font-medium transition-colors ${
                subTab === "organise" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              <Globe2 className="h-3.5 w-3.5" />
              {t("admin.voyage.tab.organise")}
              <span className="ms-1 text-[10px] opacity-70">{list.filter((v) => v.kind === "organise").length}</span>
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.search.voyages")}
              className="w-full h-10 ps-10 pe-9 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setEditing(emptyVoyage(subTab))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 h-10 text-sm font-medium hover:bg-primary-deep shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("admin.voyage.new")}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[64px_1fr_220px_120px_120px_120px] items-center gap-4 px-5 py-3 bg-secondary/60 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
          <span></span>
          <span>{t("admin.voyage.col.name")}</span>
          <span>{subTab === "excursion" ? t("admin.voyage.col.location") : t("admin.voyage.col.country")}</span>
          <span>{t("admin.voyage.col.duration")}</span>
          <span>{t("admin.voyage.col.price")}</span>
          <span className="text-end">{t("admin.voyage.col.actions")}</span>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {t("admin.voyage.empty")}
          </div>
        )}

        {filtered.map((v) => (
          <div
            key={v.id}
            className="md:grid md:grid-cols-[64px_1fr_220px_120px_120px_120px] flex items-center gap-4 px-4 md:px-5 py-3.5 border-t border-border first:border-t-0 hover:bg-secondary/40 transition-colors"
          >
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-secondary overflow-hidden shrink-0">
              {v.image_url && <img src={v.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{v.name_fr || "—"}</span>
                {v.name_ar && <span className="text-xs text-muted-foreground truncate" dir="rtl">{v.name_ar}</span>}
                {!v.published && (
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-warning/15 text-warning px-2 py-0.5">
                    {t("admin.voyage.draft")}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate font-mono">/{v.slug}</div>
            </div>
            <div className="hidden md:block text-sm text-muted-foreground truncate">
              {v.kind === "excursion"
                ? [v.wilaya, v.daira, v.commune].filter(Boolean).join(" · ") || "—"
                : v.country_fr || "—"}
            </div>
            <div className="hidden md:block text-sm">{v.days} j</div>
            <div className="hidden md:block text-sm font-medium">{formatDzd(v.price_dzd)}</div>
            <div className="flex items-center gap-1 md:justify-end">
              <button
                onClick={() => togglePublish(v)}
                title={v.published ? t("admin.voyage.published") : t("admin.voyage.draft")}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary"
              >
                {v.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
              <button
                onClick={() => setEditing({ ...v, itinerary: normalizeItinerary(v.itinerary) })}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(v)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-card rounded-3xl shadow-card border border-border my-8">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  editing.kind === "excursion" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                }`}>
                  {editing.kind === "excursion" ? <MapPin className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
                  {editing.kind === "excursion" ? t("admin.voyage.tab.excursions") : t("admin.voyage.tab.organise")}
                </span>
                <h3 className="font-display text-xl font-semibold">
                  {editing.id ? t("admin.voyage.edit") : t("admin.voyage.new")}
                </h3>
              </div>
              <button onClick={() => setEditing(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium mb-2">{t("admin.voyage.image")}</label>
                <div className="flex items-center gap-3">
                  <div className="h-24 w-32 rounded-xl bg-secondary overflow-hidden shrink-0">
                    {editing.image_url && <img src={editing.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm cursor-pointer hover:bg-primary-deep">
                    <Upload className="h-4 w-4" />
                    {uploading ? "…" : t("admin.voyage.uploadImage")}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                  </label>
                </div>
              </div>

              {/* Photo gallery (extra images) */}
              <PhotosManager voyageId={editing.id} slug={editing.slug} />

              {/* Name */}
              <BilingualField
                label={t("admin.voyage.name")}
                fr={editing.name_fr}
                ar={editing.name_ar}
                onFr={(v) => setEditing({ ...editing, name_fr: v })}
                onAr={(v) => setEditing({ ...editing, name_ar: v })}
              />

              {/* Conditional: location section */}
              {editing.kind === "excursion" ? (
                <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{t("admin.voyage.algeriaLocation")}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label={t("booking.wilaya")}>
                      <select
                        className="input-admin"
                        value={editing.wilaya}
                        onChange={(e) => setEditing({ ...editing, wilaya: e.target.value, daira: "", commune: "" })}
                      >
                        <option value="">—</option>
                        {wilayas.map((w) => (
                          <option key={w.code} value={w.name}>{w.code} — {w.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("booking.daira")}>
                      <select
                        className="input-admin"
                        value={editing.daira}
                        disabled={!editing.wilaya}
                        onChange={(e) => setEditing({ ...editing, daira: e.target.value, commune: "" })}
                      >
                        <option value="">—</option>
                        {dairas.map((d) => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("booking.baladya")}>
                      <select
                        className="input-admin"
                        value={editing.commune}
                        disabled={!editing.daira}
                        onChange={(e) => setEditing({ ...editing, commune: e.target.value })}
                      >
                        <option value="">—</option>
                        {communes.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">{t("admin.voyage.country")}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Pays (FR)">
                      <input className="input-admin" placeholder="Ex. Turquie"
                        value={editing.country_fr}
                        onChange={(e) => setEditing({ ...editing, country_fr: e.target.value })} />
                    </Field>
                    <Field label="البلد (AR)">
                      <input className="input-admin" dir="rtl" placeholder="مثال: تركيا"
                        value={editing.country_ar}
                        onChange={(e) => setEditing({ ...editing, country_ar: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Tagline */}
              <BilingualField
                label={t("admin.voyage.tagline")}
                fr={editing.tagline_fr}
                ar={editing.tagline_ar}
                onFr={(v) => setEditing({ ...editing, tagline_fr: v })}
                onAr={(v) => setEditing({ ...editing, tagline_ar: v })}
              />

              {/* Description */}
              <BilingualField
                label={t("admin.voyage.description")}
                fr={editing.description_fr}
                ar={editing.description_ar}
                onFr={(v) => setEditing({ ...editing, description_fr: v })}
                onAr={(v) => setEditing({ ...editing, description_ar: v })}
                multiline
              />

              <div className="grid grid-cols-3 gap-3">
                <Field label={t("admin.voyage.days")}>
                  <input type="number" min={1} className="input-admin" value={editing.days}
                    onChange={(e) => setEditing({ ...editing, days: parseInt(e.target.value) || 1 })} />
                </Field>
                <Field label={t("admin.voyage.price")}>
                  <input type="number" min={0} className="input-admin" value={editing.price_dzd}
                    onChange={(e) => setEditing({ ...editing, price_dzd: parseInt(e.target.value) || 0 })} />
                </Field>
                <Field label={t("admin.voyage.sortOrder")}>
                  <input type="number" className="input-admin" value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                </Field>
              </div>

              {/* Slug */}
              <Field label={t("admin.voyage.slug")} help={t("admin.voyage.slugHelp")}>
                <input className="input-admin font-mono text-sm" value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder="ex-tassili-djanet" />
              </Field>

              {/* Itinerary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">{t("admin.voyage.itinerary")}</label>
                  <button onClick={addDay} type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-secondary/70">
                    <Plus className="h-3.5 w-3.5" />
                    {t("admin.voyage.addDay")}
                  </button>
                </div>
                <div className="space-y-3">
                  {editing.itinerary.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      {t("admin.voyage.noDays")}
                    </div>
                  )}
                  {editing.itinerary.map((d, idx) => (
                    <div key={idx} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="inline-flex items-center gap-2 text-sm font-medium">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          {t("admin.voyage.day")} {idx + 1}
                        </div>
                        <button onClick={() => removeDay(idx)} type="button"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-destructive/10 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="input-admin" placeholder={`${t("admin.voyage.dayTitle")} (FR)`}
                          value={d.title.fr} onChange={(e) => updateDay(idx, { title: { ...d.title, fr: e.target.value } })} />
                        <input className="input-admin" dir="rtl" placeholder={`${t("admin.voyage.dayTitle")} (AR)`}
                          value={d.title.ar} onChange={(e) => updateDay(idx, { title: { ...d.title, ar: e.target.value } })} />
                        <textarea rows={2} className="input-admin" placeholder={`${t("admin.voyage.dayBody")} (FR)`}
                          value={d.body.fr} onChange={(e) => updateDay(idx, { body: { ...d.body, fr: e.target.value } })} />
                        <textarea rows={2} className="input-admin" dir="rtl" placeholder={`${t("admin.voyage.dayBody")} (AR)`}
                          value={d.body.ar} onChange={(e) => updateDay(idx, { body: { ...d.body, ar: e.target.value } })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Included items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium inline-flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    {t("voyage.included")}
                  </label>
                  <div className="flex items-center gap-2">
                    {editing.included.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, included: [...DEFAULT_INCLUDED] })}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/15"
                      >
                        {t("admin.voyage.useDefaults")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, included: [...editing.included, { fr: "", ar: "" }] })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("admin.voyage.addIncluded")}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">{t("admin.voyage.includedHelp")}</p>
                <div className="space-y-2">
                  {editing.included.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                      {t("admin.voyage.includedEmpty")}
                    </div>
                  )}
                  {editing.included.map((it, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-2.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                        {idx + 1}
                      </span>
                      <input
                        className="input-admin flex-1"
                        placeholder="Français — ex. Transport climatisé"
                        value={it.fr}
                        onChange={(e) => setEditing({
                          ...editing,
                          included: editing.included.map((x, i) => i === idx ? { ...x, fr: e.target.value } : x),
                        })}
                      />
                      <input
                        className="input-admin flex-1"
                        dir="rtl"
                        placeholder="العربية — مثال: نقل مكيف"
                        value={it.ar}
                        onChange={(e) => setEditing({
                          ...editing,
                          included: editing.included.map((x, i) => i === idx ? { ...x, ar: e.target.value } : x),
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setEditing({
                          ...editing,
                          included: editing.included.filter((_, i) => i !== idx),
                        })}
                        className="mt-1 h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-destructive/10 text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 select-none">
                <input type="checkbox" checked={editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
                <span className="text-sm">{t("admin.voyage.published")}</span>
              </label>
            </div>

            <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card rounded-b-3xl">
              <button onClick={() => setEditing(null)} className="rounded-full px-5 py-2.5 text-sm border border-border hover:bg-secondary">
                {t("admin.voyage.cancel")}
              </button>
              <button onClick={save} disabled={saving || !editing.name_fr}
                className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary-deep disabled:opacity-50">
                {saving ? "…" : t("admin.voyage.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-admin {
          width: 100%;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .input-admin:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.12);
        }
        .input-admin:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
};

const Field = ({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium mb-1.5 text-muted-foreground">{label}</label>
    {children}
    {help && <p className="mt-1 text-[11px] text-muted-foreground">{help}</p>}
  </div>
);

const BilingualField = ({
  label, fr, ar, onFr, onAr, multiline,
}: {
  label: string; fr: string; ar: string;
  onFr: (v: string) => void; onAr: (v: string) => void;
  multiline?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium mb-2">{label}</label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Français</span>
        {multiline ? (
          <textarea rows={4} className="input-admin" value={fr} onChange={(e) => onFr(e.target.value)} />
        ) : (
          <input className="input-admin" value={fr} onChange={(e) => onFr(e.target.value)} />
        )}
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">العربية</span>
        {multiline ? (
          <textarea rows={4} dir="rtl" className="input-admin" value={ar} onChange={(e) => onAr(e.target.value)} />
        ) : (
          <input className="input-admin" dir="rtl" value={ar} onChange={(e) => onAr(e.target.value)} />
        )}
      </div>
    </div>
  </div>
);

const PhotosManager = ({ voyageId, slug }: { voyageId: string; slug: string }) => {
  const [photos, setPhotos] = useState<VoyagePhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  const load = async () => {
    if (!voyageId) return;
    try {
      setPhotos(await api.voyagePhotos.listByVoyage(voyageId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [voyageId]);

  const onUpload = async (files: FileList | null) => {
    if (!files || !voyageId) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${slug || voyageId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const url = await api.storage.upload("voyage-images", path, file, file.type);
        const created = await api.voyagePhotos.add(voyageId, url, null);
        setPhotos((p) => [...p, created]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.voyagePhotos.remove(id);
      setPhotos((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...photos];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setPhotos(next);
    try { await api.voyagePhotos.reorder(next.map((p) => p.id)); } catch { /* noop */ }
  };

  if (!voyageId) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground inline-flex items-center gap-2">
        <Camera className="h-4 w-4" />
        {t("admin.voyage.photos.saveFirst")}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium inline-flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          {t("admin.voyage.photos")}
          <span className="text-xs text-muted-foreground tabular-nums">({photos.length})</span>
        </label>
        <label className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-foreground px-3 py-1.5 text-xs font-medium hover:bg-secondary/70 cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          {busy ? "…" : t("admin.voyage.photos.add")}
          <input type="file" accept="image/*" multiple hidden disabled={busy}
            onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{t("admin.voyage.photos.help")}</p>

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
          {t("admin.voyage.photos.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
              <img src={p.image_url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/55 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-paper/90 text-ink disabled:opacity-30">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-paper/90 text-ink disabled:opacity-30">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => remove(p.id)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="absolute top-1 start-1 text-[10px] font-mono bg-ink/70 text-paper rounded px-1.5 py-0.5">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
