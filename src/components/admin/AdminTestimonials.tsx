import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Eye, EyeOff, Upload, X, Star, MessageSquareQuote } from "lucide-react";
import { api, type Testimonial, type TestimonialUpsertPayload } from "@/services/api";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "sonner";

const empty = (): TestimonialUpsertPayload => ({
  author_name: "",
  author_photo_url: null,
  rating: 5,
  message_fr: "",
  message_ar: "",
  message_en: "",
  voyage_slug: null,
  published: true,
  sort_order: 0,
});

export const AdminTestimonials = () => {
  const { t } = useI18n();
  const [list, setList] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<(TestimonialUpsertPayload & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const data = await api.testimonials.listAll();
      setList(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (it: Testimonial) => {
    try {
      await api.testimonials.setPublished(it.id, !it.published);
      setList((l) => l.map((x) => x.id === it.id ? { ...x, published: !it.published } : x));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (it: Testimonial) => {
    if (!confirm(t("admin.testimonial.confirmDelete"))) return;
    try {
      await api.testimonials.remove(it.id);
      setList((l) => l.filter((x) => x.id !== it.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `testimonials/${crypto.randomUUID()}.${ext}`;
      const url = await api.storage.upload("site-assets", path, file, file.type);
      setEditing({ ...editing, author_photo_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.author_name.trim()) {
      toast.error(t("admin.testimonial.author"));
      return;
    }
    setSaving(true);
    try {
      await api.testimonials.upsert(editing);
      toast.success("✓");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-3 md:p-4 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          <span><span className="text-foreground font-medium tabular-nums">{list.length}</span> · {t("admin.testimonials")}</span>
        </div>
        <button
          onClick={() => setEditing(empty())}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 h-10 text-sm font-medium hover:bg-primary-deep"
        >
          <Plus className="h-4 w-4" />
          {t("admin.testimonial.new")}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {list.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {t("admin.testimonial.empty")}
          </div>
        )}
        {list.map((it) => (
          <div
            key={it.id}
            className="flex items-start gap-4 px-4 md:px-5 py-4 border-t border-border first:border-t-0 hover:bg-secondary/40 transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center font-display font-semibold overflow-hidden shrink-0">
              {it.author_photo_url ? (
                <img src={it.author_photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                it.author_name.trim().charAt(0).toUpperCase() || "·"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{it.author_name}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < it.rating ? "fill-primary text-primary" : "text-border"}`} />
                  ))}
                </div>
                {!it.published && (
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-warning/15 text-warning px-2 py-0.5">
                    {t("admin.voyage.draft")}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {it.message_fr || it.message_ar}
              </p>
              {it.voyage_slug && (
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">/{it.voyage_slug}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => togglePublish(it)} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary">
                {it.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
              <button onClick={() => setEditing({ ...it })} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary">
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={() => remove(it)} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-destructive/10 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card rounded-3xl shadow-card border border-border my-8">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
              <h3 className="font-display text-xl font-semibold">
                {editing.id ? t("admin.testimonial.edit") : t("admin.testimonial.new")}
              </h3>
              <button onClick={() => setEditing(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium mb-2">{t("admin.testimonial.photo")}</label>
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 rounded-full bg-secondary overflow-hidden inline-flex items-center justify-center shrink-0">
                    {editing.author_photo_url
                      ? <img src={editing.author_photo_url} alt="" className="h-full w-full object-cover" />
                      : <span className="text-2xl text-muted-foreground">·</span>}
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border cursor-pointer hover:bg-secondary text-sm">
                    <Upload className="h-4 w-4" />
                    {uploading ? "…" : t("admin.voyage.uploadImage")}
                    <input
                      type="file" accept="image/*" hidden
                      onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                    />
                  </label>
                  {editing.author_photo_url && (
                    <button
                      onClick={() => setEditing({ ...editing, author_photo_url: null })}
                      className="text-xs text-destructive hover:underline"
                    >
                      {t("admin.delete")}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t("admin.testimonial.author")}</label>
                  <input
                    type="text"
                    value={editing.author_name}
                    onChange={(e) => setEditing({ ...editing, author_name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t("admin.testimonial.rating")}</label>
                  <select
                    value={editing.rating}
                    onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{"★".repeat(n)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("admin.testimonial.message")} (FR)</label>
                <textarea
                  rows={3}
                  value={editing.message_fr}
                  onChange={(e) => setEditing({ ...editing, message_fr: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t("admin.testimonial.message")} (AR)</label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={editing.message_ar}
                  onChange={(e) => setEditing({ ...editing, message_ar: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("admin.testimonial.voyageSlug")}</label>
                <input
                  type="text"
                  value={editing.voyage_slug || ""}
                  onChange={(e) => setEditing({ ...editing, voyage_slug: e.target.value || null })}
                  placeholder="ex. tassili-djanet"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.published}
                    onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  {t("admin.voyage.published")}
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary">
                    {t("admin.voyage.cancel")}
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-deep disabled:opacity-60"
                  >
                    {t("admin.voyage.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
