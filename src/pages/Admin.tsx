import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileDown, Trash2, Plus, Mic, Receipt, CheckCircle2, Search, X,
  RefreshCw, Filter, Calendar, ArrowUpDown, Users, Wallet, TrendingUp, Menu,
  Lock, Mail as MailIcon, Eye, EyeOff, Phone as PhoneIcon, MapPin as MapPinIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { api } from "@/services/api";
import { formatDzd } from "@/lib/format";
import { AGENCY } from "@/lib/agency";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AdminVoyages } from "@/components/admin/AdminVoyages";
import { AdminScan } from "@/components/admin/AdminScan";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { AdminKpis } from "@/components/admin/AdminKpis";
import { AdminHero } from "@/components/admin/AdminHero";
import { AdminTestimonials } from "@/components/admin/AdminTestimonials";
import { loadArabicFont, registerArabicFont, shapeArabic } from "@/lib/pdfArabic";
import { FullLoader, Spinner } from "@/components/ui/Loader";
import { SEO } from "@/components/SEO";

interface Booking {
  id: string;
  tracking_code: string;
  voyage_name: string;
  voyage_slug: string;
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
  checked_in_by: string | null;
  created_at: string;
}

interface Blacklist {
  id: string;
  phone: string;
  reason: string | null;
}

type StatusFilter = "all" | "awaiting_payment" | "confirmed" | "cancelled";
type RangeFilter = "all" | "today" | "week" | "month";
type SortBy = "recent" | "oldest" | "amount";
type KindFilter = "all" | "excursion" | "organise";

interface VoyageLite {
  slug: string;
  name: string;
  kind: "excursion" | "organise";
}

const Admin = () => {
  const { t } = useI18n();
  const nav = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [tab, setTab] = useState<AdminTab>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [adminEmails, setAdminEmails] = useState<Record<string, string>>({});
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Booking | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Bookings filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [voyageFilter, setVoyageFilter] = useState<string>("all"); // slug or "all"
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [search, setSearch] = useState("");
  const [voyagesList, setVoyagesList] = useState<VoyageLite[]>([]);
  const [showVoyageExportMenu, setShowVoyageExportMenu] = useState(false);

  useEffect(() => {
    // Title is set by <SEO /> below; admin pages are noindex.
    const unsubscribe = api.auth.onChange((session) => {
      checkAdmin(session?.userId);
    });
    api.auth.getSession().then((s) => checkAdmin(s?.userId));
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdmin = async (userId?: string) => {
    if (!userId) {
      setAuthed(false);
      return;
    }
    const isAdmin = await api.auth.isAdmin(userId);
    if (isAdmin) {
      setAuthed(true);
      loadData();
    } else {
      setAuthed(false);
      toast.error(t("admin.notAdmin"));
      await api.auth.signOut();
    }
  };

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [bs, bl, vs] = await Promise.all([
        api.bookings.list(),
        api.blacklist.list(),
        api.voyages.list({ includeUnpublished: true }),
      ]);
      setBookings(bs);
      setBlacklist(bl);
      setVoyagesList(
        vs.map((v) => ({
          slug: v.slug,
          name: v.name?.fr || v.name?.en || v.slug,
          kind: v.kind,
        })),
      );

      const ids = Array.from(new Set(bs.map((x) => x.checked_in_by).filter(Boolean))) as string[];
      if (ids.length) {
        const map = await api.auth.getAdminEmails(ids);
        setAdminEmails(map);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      await api.auth.signInWithPassword(email, password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    setAuthed(false);
    nav("/");
  };

  const setStatus = async (id: string, status: Booking["status"]) => {
    try {
      await api.bookings.setStatus(id, status);
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteBooking = async (id: string) => {
    setDeletingId(id);
    try {
      await api.bookings.remove(id);
      setBookings((bs) => bs.filter((b) => b.id !== id));
      toast.success(t("admin.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const addBlacklist = async () => {
    const phone = newPhone.replace(/\s/g, "");
    if (!/^\d{8,15}$/.test(phone)) return toast.error("Numéro invalide");
    try {
      const created = await api.blacklist.add(phone, newReason || null);
      setBlacklist((b) => [created, ...b]);
      setNewPhone("");
      setNewReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add failed");
    }
  };

  const removeBlacklist = async (id: string) => {
    try {
      await api.blacklist.remove(id);
      setBlacklist((b) => b.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  // ─── Filtered + sorted bookings ─────────────────────────────────────
  const voyageKindBySlug = useMemo(() => {
    const m: Record<string, "excursion" | "organise"> = {};
    voyagesList.forEach((v) => { m[v.slug] = v.kind; });
    return m;
  }, [voyagesList]);

  const filteredBookings = useMemo(() => {
    let list = bookings.slice();

    if (statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }

    if (kindFilter !== "all") {
      list = list.filter((b) => voyageKindBySlug[b.voyage_slug] === kindFilter);
    }

    if (voyageFilter !== "all") {
      list = list.filter((b) => b.voyage_slug === voyageFilter);
    }

    if (rangeFilter !== "all") {
      const now = Date.now();
      const day = 86400000;
      const cutoff =
        rangeFilter === "today" ? now - day :
        rangeFilter === "week" ? now - 7 * day :
        now - 30 * day;
      list = list.filter((b) => new Date(b.created_at).getTime() >= cutoff);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) =>
        [b.tracking_code, b.full_name, b.phone_primary, b.phone_secondary, b.voyage_name, b.wilaya]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    if (sortBy === "oldest") {
      list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    } else if (sortBy === "amount") {
      list.sort((a, b) => (b.total_dzd || 0) - (a.total_dzd || 0));
    } else {
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    return list;
  }, [bookings, statusFilter, kindFilter, voyageFilter, rangeFilter, search, sortBy, voyageKindBySlug]);

  // Voyages that actually have bookings, optionally narrowed by kindFilter, sorted by booking count
  const voyagesForFilter = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      if (kindFilter !== "all" && voyageKindBySlug[b.voyage_slug] !== kindFilter) return;
      counts[b.voyage_slug] = (counts[b.voyage_slug] || 0) + 1;
    });
    return voyagesList
      .filter((v) => (kindFilter === "all" ? true : v.kind === kindFilter))
      .map((v) => ({ ...v, count: counts[v.slug] || 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [bookings, voyagesList, kindFilter, voyageKindBySlug]);

  // ─── KPIs (computed on filtered set) ───────────────────────────────
  const kpis = useMemo(() => {
    const total = filteredBookings.length;
    const travelers = filteredBookings.reduce((s, b) => s + (b.travelers || 0), 0);
    const revenue = filteredBookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + (b.total_dzd || 0), 0);
    const checkins = filteredBookings.filter((b) => b.checked_in_at).length;
    return { total, travelers, revenue, checkins };
  }, [filteredBookings]);

  const exportPDF = async (
    override?: { list: Booking[]; label: string; fileSuffix: string },
  ) => {
    setPdfBusy(true);
    try {
    const filtered = override?.list ?? filteredBookings;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;

    let hasArabic = false;
    try {
      const b64 = await loadArabicFont();
      registerArabicFont(doc, b64);
      hasArabic = true;
    } catch (e) {
      console.warn("Arabic font unavailable, skipping AR page", e);
    }

    const statusFr: Record<Booking["status"], string> = {
      awaiting_payment: "En attente",
      confirmed: "Confirmee",
      cancelled: "Annulee",
    };
    const statusAr: Record<Booking["status"], string> = {
      awaiting_payment: "في الانتظار",
      confirmed: "مؤكد",
      cancelled: "ملغى",
    };
    const filterLabel =
      override?.label ??
      (statusFilter === "all" ? "Toutes" : statusFr[statusFilter as Booking["status"]] ?? String(statusFilter));

    const sanitize = (v: unknown): string => {
      if (v === null || v === undefined) return "-";
      const s = String(v).replace(/[\u00A0\u202F\u2009]/g, " ");
      const cleaned = s.replace(/[^\x20-\xFF]/g, "").replace(/\s+/g, " ").trim();
      return cleaned || "-";
    };
    const fmtDate = (iso: string | null) =>
      iso
        ? sanitize(
            new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
          )
        : "-";
    const fmtNum = (n: number) =>
      (n || 0).toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2009]/g, " ");

    const drawHeader = (titleLatin: string) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ALFAROUK VOYAGE", margin, 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(titleLatin, margin, 15);
      doc.setFontSize(8.5);
      doc.text(
        `Genere le ${sanitize(new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }))}`,
        pageW - margin, 9, { align: "right" },
      );
      doc.text(`Filtre: ${filterLabel}`, pageW - margin, 15, { align: "right" });
    };

    const drawFooter = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(`${AGENCY.name} — ${AGENCY.phone}`, margin, pageH - 6);
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber} / ${doc.getNumberOfPages()}`,
        pageW - margin, pageH - 6, { align: "right" },
      );
    };

    drawHeader("Liste des passagers");

    const total = filtered.length;
    const travelers = filtered.reduce((s, b) => s + (b.travelers || 0), 0);
    const revenue = filtered
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + (b.total_dzd || 0), 0);
    const checkedIn = filtered.filter((b) => b.checked_in_at).length;

    const cards: Array<[string, string]> = [
      ["RESERVATIONS", String(total)],
      ["VOYAGEURS", String(travelers)],
      ["PRESENCES", String(checkedIn)],
      ["CA CONFIRME (DZD)", fmtNum(revenue)],
    ];
    const cardGap = 4;
    const cardW = (pageW - margin * 2 - cardGap * 3) / 4;
    cards.forEach(([label, value], i) => {
      const x = margin + i * (cardW + cardGap);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, 26, cardW, 16, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(label, x + 3, 31);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(value, x + 3, 39);
    });

    autoTable(doc, {
      startY: 48,
      head: [[
        "#", "Code", "Passager", "Tel.", "Voyage", "Pers.",
        "Wilaya", "Total DZD", "Statut", "Presence",
      ]],
      body: filtered.map((b, i) => [
        String(i + 1),
        sanitize(b.tracking_code),
        sanitize(b.full_name),
        sanitize(b.phone_primary),
        sanitize(b.voyage_name),
        String(b.travelers),
        sanitize(b.wilaya),
        fmtNum(b.total_dzd || 0),
        statusFr[b.status],
        fmtDate(b.checked_in_at),
      ]),
      theme: "grid",
      styles: {
        font: "helvetica", fontSize: 8, cellPadding: 2,
        textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1,
        overflow: "linebreak", valign: "middle",
      },
      headStyles: {
        fillColor: [15, 23, 42], textColor: [255, 255, 255],
        fontStyle: "bold", fontSize: 8.5, halign: "left",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8, halign: "right" },
        1: { cellWidth: 22, font: "courier", fontSize: 7 },
        2: { cellWidth: 38 },
        3: { cellWidth: 24, font: "courier", fontSize: 7 },
        4: { cellWidth: 40 },
        5: { cellWidth: 11, halign: "center" },
        6: { cellWidth: 22 },
        7: { cellWidth: 22, halign: "right" },
        8: { cellWidth: 22 },
        9: { cellWidth: 32, fontSize: 7.5 },
      },
      margin: { left: margin, right: margin, top: 22, bottom: 14 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 8) {
          const raw = filtered[data.row.index]?.status;
          const colors: Record<string, [number, number, number]> = {
            confirmed: [22, 163, 74],
            awaiting_payment: [202, 138, 4],
            cancelled: [220, 38, 38],
          };
          const c = colors[raw];
          if (c) {
            data.cell.styles.textColor = c;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      didDrawPage: () => drawFooter(),
    });

    if (filtered.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text("Aucune reservation pour ce filtre.", pageW / 2, 70, { align: "center" });
    }

    if (hasArabic && filtered.length > 0) {
      doc.addPage("a4", "landscape");
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Amiri", "normal");
      doc.setFontSize(15);
      doc.text(shapeArabic("الفاروق فوياج"), pageW - margin, 10, { align: "right" });
      doc.setFontSize(10);
      doc.text(shapeArabic("قائمة المسافرين"), pageW - margin, 16, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(
        `Genere le ${sanitize(new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }))}`,
        margin, 10,
      );

      const arHead = [
        shapeArabic("الحضور"), shapeArabic("الحالة"), shapeArabic("المجموع دج"),
        shapeArabic("الولاية"), shapeArabic("عدد"), shapeArabic("الرحلة"),
        shapeArabic("الهاتف"), shapeArabic("المسافر"), shapeArabic("الرمز"), "#",
      ];
      const arBody = filtered.map((b, i) => [
        fmtDate(b.checked_in_at),
        shapeArabic(statusAr[b.status]),
        fmtNum(b.total_dzd || 0),
        shapeArabic(b.wilaya || "-"),
        String(b.travelers),
        shapeArabic(b.voyage_name || "-"),
        b.phone_primary || "-",
        shapeArabic(b.full_name || "-"),
        b.tracking_code,
        String(i + 1),
      ]);

      autoTable(doc, {
        startY: 26, head: [arHead], body: arBody, theme: "grid",
        styles: {
          font: "Amiri", fontSize: 9, cellPadding: 2,
          textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1,
          halign: "right", valign: "middle", overflow: "linebreak",
        },
        headStyles: {
          fillColor: [15, 23, 42], textColor: [255, 255, 255],
          font: "Amiri", fontStyle: "normal", fontSize: 9.5, halign: "right",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 32, halign: "center", font: "helvetica", fontSize: 7.5 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22, halign: "center", font: "helvetica", fontSize: 8 },
          3: { cellWidth: 22 },
          4: { cellWidth: 11, halign: "center", font: "helvetica", fontSize: 8 },
          5: { cellWidth: 40 },
          6: { cellWidth: 24, halign: "center", font: "courier", fontSize: 7 },
          7: { cellWidth: 38 },
          8: { cellWidth: 22, halign: "center", font: "courier", fontSize: 7 },
          9: { cellWidth: 8, halign: "center", font: "helvetica", fontSize: 8 },
        },
        margin: { left: margin, right: margin, top: 22, bottom: 14 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            const raw = filtered[data.row.index]?.status;
            const colors: Record<string, [number, number, number]> = {
              confirmed: [22, 163, 74],
              awaiting_payment: [202, 138, 4],
              cancelled: [220, 38, 38],
            };
            const c = colors[raw];
            if (c) data.cell.styles.textColor = c;
          }
        },
        didDrawPage: () => drawFooter(),
      });
    }

    const suffix = override?.fileSuffix ? `-${override.fileSuffix}` : "";
    doc.save(`alfarouk-passagers${suffix}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error(t("booking.error"));
    } finally {
      setPdfBusy(false);
    }
  };

  // ─── CSV export ─────────────────────────────────────────────────────
  const exportCSV = (
    override?: { list: Booking[]; fileSuffix: string },
  ) => {
    const list = override?.list ?? filteredBookings;
    const statusFr: Record<Booking["status"], string> = {
      awaiting_payment: "En attente",
      confirmed: "Confirmée",
      cancelled: "Annulée",
    };
    const headers = [
      "Code",
      "Date",
      "Passager",
      "Téléphone 1",
      "Téléphone 2",
      "Voyage",
      "Voyageurs",
      "Wilaya",
      "Daïra",
      "Baladya",
      "Point de ramassage",
      "Total DZD",
      "Statut",
      "Présence",
      "Notes",
    ];
    const escape = (v: unknown): string => {
      const s = v === null || v === undefined ? "" : String(v);
      // Excel-friendly: quote everything containing ; , " \n or starting with =,+,-,@
      const needsQuote = /[",;\n\r]/.test(s) || /^[=+\-@]/.test(s);
      const safe = s.replace(/"/g, '""');
      return needsQuote ? `"${safe}"` : safe;
    };
    const fmtDate = (iso: string | null) =>
      iso
        ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
        : "";

    const rows = list.map((b) => [
      b.tracking_code,
      fmtDate(b.created_at),
      b.full_name,
      b.phone_primary,
      b.phone_secondary || "",
      b.voyage_name,
      b.travelers,
      b.wilaya,
      b.daira,
      b.baladya,
      b.pickup_point,
      b.total_dzd || 0,
      statusFr[b.status],
      fmtDate(b.checked_in_at),
      "",
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map(escape).join(";"))
      .join("\r\n");

    // BOM so Excel detects UTF-8 (handles Arabic / accents)
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix = override?.fileSuffix ? `-${override.fileSuffix}` : "";
    a.href = url;
    a.download = `alfarouk-passagers${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("admin.csv.exported"));
  };

  if (authed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SEO title="Administration" description="Espace d'administration Alfarouk Voyage." noIndex />
        <Spinner size="lg" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-secondary/40 flex items-center justify-center p-4">
        <SEO title={t("admin.login")} description="Connexion administrateur Alfarouk Voyage." noIndex />
        {/* Ambient brand backdrop */}
        <div className="blob bg-primary/20 -top-24 -start-24 h-72 w-72" />
        <div className="blob bg-primary/10 -bottom-24 -end-16 h-80 w-80" style={{ animationDelay: "-7s" }} />

        <form
          onSubmit={signIn}
          className="relative w-full max-w-md rounded-3xl border border-border bg-card/95 backdrop-blur p-7 sm:p-8 shadow-card animate-fade-in-up"
        >
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-display text-2xl font-semibold tracking-tight">Alfarouk</span>
            <span className="font-display text-2xl text-primary">Voyage.</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] font-semibold mt-3 mb-2">
            <Lock className="h-3 w-3" />
            Admin
          </div>
          <h1 className="font-display text-2xl font-semibold mb-1">{t("admin.login")}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Accès réservé à l'équipe Alfarouk.
          </p>

          <label className="block text-sm font-medium mb-2" htmlFor="admin-email">
            {t("admin.email")}
          </label>
          <div className="relative mb-4">
            <MailIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-background ps-10 pe-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
              placeholder="info@alfaroukdz.com"
            />
          </div>

          <label className="block text-sm font-medium mb-2" htmlFor="admin-password">
            {t("admin.password")}
          </label>
          <div className="relative mb-6">
            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-background ps-10 pe-11 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={signingIn}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-medium hover:bg-primary-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed press-down"
          >
            {signingIn ? <Spinner /> : <Lock className="h-4 w-4" />}
            {t("admin.signin")}
          </button>
        </form>
      </div>
    );
  }

  const tabTitle: Record<AdminTab, string> = {
    bookings: t("admin.bookings"),
    voyages: t("admin.voyages"),
    hero: t("admin.hero"),
    testimonials: t("admin.testimonials"),
    scan: t("admin.scan"),
    blacklist: t("admin.blacklist"),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Administration" description="Espace d'administration Alfarouk Voyage." noIndex />
      <div className="flex w-full">
        <AdminSidebar
          active={tab}
          onChange={setTab}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          counts={{ bookings: bookings.length, blacklist: blacklist.length }}
          onSignOut={signOut}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 min-w-0 w-full">
          {/* Page header */}
          <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
            <div className="px-4 sm:px-5 md:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open menu"
                  className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-secondary text-foreground shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="font-display text-lg sm:text-xl md:text-2xl font-semibold truncate">
                    {tabTitle[tab]}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                    {tab === "bookings" && `${bookings.length} ${t("admin.kpi.bookings").toLowerCase()}`}
                    {tab === "blacklist" && `${blacklist.length} ${t("admin.blacklist").toLowerCase()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={loadData}
                  className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${dataLoading ? "animate-spin" : ""}`} />
                  {t("admin.refresh")}
                </button>
                <button
                  onClick={loadData}
                  aria-label={t("admin.refresh")}
                  className="sm:hidden h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-card hover:bg-secondary"
                >
                  <RefreshCw className={`h-4 w-4 ${dataLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-8 space-y-6 max-w-[1500px] mx-auto">
            {tab === "bookings" && (
              <>
                {/* KPIs */}
                <AdminKpis
                  items={[
                    { label: t("admin.kpi.bookings"), value: String(kpis.total), icon: TrendingUp, tone: "primary" },
                    { label: t("admin.kpi.travelers"), value: String(kpis.travelers), icon: Users, tone: "primary" },
                    { label: t("admin.kpi.checkins"), value: String(kpis.checkins), icon: CheckCircle2, tone: "success" },
                    { label: t("admin.kpi.revenue"), value: formatDzd(kpis.revenue), icon: Wallet, tone: "success" },
                  ]}
                />

                {/* Toolbar */}
                <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("admin.search.bookings")}
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

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                      <SelectChip
                        icon={<Filter className="h-3.5 w-3.5" />}
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v as StatusFilter)}
                        options={[
                          { value: "all", label: t("admin.filter.all") },
                          { value: "awaiting_payment", label: t("admin.filter.awaiting") },
                          { value: "confirmed", label: t("admin.filter.confirmed") },
                          { value: "cancelled", label: t("admin.filter.cancelled") },
                        ]}
                      />
                      <SelectChip
                        icon={<Filter className="h-3.5 w-3.5" />}
                        value={kindFilter}
                        onChange={(v) => {
                          setKindFilter(v as KindFilter);
                          setVoyageFilter("all");
                        }}
                        options={[
                          { value: "all", label: t("admin.filter.kind.all") },
                          { value: "excursion", label: t("admin.filter.kind.excursion") },
                          { value: "organise", label: t("admin.filter.kind.organise") },
                        ]}
                      />
                      <SelectChip
                        icon={<Filter className="h-3.5 w-3.5" />}
                        value={voyageFilter}
                        onChange={(v) => setVoyageFilter(v)}
                        options={[
                          { value: "all", label: t("admin.filter.voyage.all") },
                          ...voyagesForFilter.map((v) => ({
                            value: v.slug,
                            label: v.count > 0 ? `${v.name} (${v.count})` : v.name,
                          })),
                        ]}
                      />
                      <SelectChip
                        icon={<Calendar className="h-3.5 w-3.5" />}
                        value={rangeFilter}
                        onChange={(v) => setRangeFilter(v as RangeFilter)}
                        options={[
                          { value: "all", label: t("admin.range.all") },
                          { value: "today", label: t("admin.range.today") },
                          { value: "week", label: t("admin.range.week") },
                          { value: "month", label: t("admin.range.month") },
                        ]}
                      />
                      <SelectChip
                        icon={<ArrowUpDown className="h-3.5 w-3.5" />}
                        value={sortBy}
                        onChange={(v) => setSortBy(v as SortBy)}
                        options={[
                          { value: "recent", label: t("admin.sort.recent") },
                          { value: "oldest", label: t("admin.sort.oldest") },
                          { value: "amount", label: t("admin.sort.amount") },
                        ]}
                      />
                      <button
                        onClick={() => exportPDF()}
                        disabled={pdfBusy}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ink text-paper text-sm font-medium hover:bg-primary hover:shadow-glow transition-all disabled:opacity-60"
                      >
                        {pdfBusy ? <Spinner /> : <FileDown className="h-4 w-4" />}
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                      <button
                        onClick={() => exportCSV()}
                        disabled={pdfBusy}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition-all disabled:opacity-60"
                      >
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">CSV</span>
                      </button>

                      {/* Per-voyage export menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowVoyageExportMenu((s) => !s)}
                          disabled={pdfBusy || voyagesForFilter.length === 0}
                          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition-all disabled:opacity-60"
                        >
                          <FileDown className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("admin.export.byVoyage")}</span>
                        </button>
                        {showVoyageExportMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowVoyageExportMenu(false)}
                            />
                            <div className="absolute end-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-border bg-popover shadow-xl z-50 py-1">
                              {voyagesForFilter.length === 0 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground">—</div>
                              )}
                              {voyagesForFilter.map((v) => (
                                <div
                                  key={v.slug}
                                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-secondary/60 rounded-md"
                                >
                                  <div className="flex-1 min-w-0 px-1">
                                    <div className="truncate text-sm">{v.name}</div>
                                    <div className="text-[10px] text-muted-foreground tabular-nums">
                                      {v.count} {t("admin.results")}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setShowVoyageExportMenu(false);
                                      const list = bookings.filter((b) => b.voyage_slug === v.slug);
                                      exportPDF({ list, label: v.name, fileSuffix: v.slug });
                                    }}
                                    disabled={v.count === 0}
                                    className="text-[11px] font-medium px-2 py-1 rounded-md bg-ink text-paper hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                  >
                                    PDF
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowVoyageExportMenu(false);
                                      const list = bookings.filter((b) => b.voyage_slug === v.slug);
                                      exportCSV({ list, fileSuffix: v.slug });
                                    }}
                                    disabled={v.count === 0}
                                    className="text-[11px] font-medium px-2 py-1 rounded-md border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                  >
                                    CSV
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active filters / results count */}
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="tabular-nums font-medium text-foreground">
                        {filteredBookings.length}
                      </span>
                      <span>{t("admin.results")}</span>
                      {(statusFilter !== "all" || rangeFilter !== "all" || kindFilter !== "all" || voyageFilter !== "all" || search) && (
                        <button
                          onClick={() => { setStatusFilter("all"); setRangeFilter("all"); setKindFilter("all"); setVoyageFilter("all"); setSearch(""); }}
                          className="ms-2 inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <X className="h-3 w-3" /> {t("admin.clear")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table — desktop / tablet */}
                <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-start px-4 py-3 font-medium">Code</th>
                        <th className="text-start px-4 py-3 font-medium">Passager</th>
                        <th className="text-start px-4 py-3 font-medium">Voyage</th>
                        <th className="text-start px-4 py-3 font-medium">Tel.</th>
                        <th className="text-start px-4 py-3 font-medium">Wilaya</th>
                        <th className="text-end px-4 py-3 font-medium">Total</th>
                        <th className="text-start px-4 py-3 font-medium">Statut</th>
                        <th className="text-end px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="border-t border-border hover:bg-secondary/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">{b.tracking_code}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{b.full_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(b.created_at).toLocaleDateString("fr-FR")}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate max-w-[200px]">{b.voyage_name}</div>
                            <div className="text-[11px] text-muted-foreground">{b.travelers} pers.</div>
                          </td>
                          <td className="px-4 py-3" dir="ltr">
                            {b.phone_primary}
                            {b.phone_secondary && <div className="text-xs text-muted-foreground">{b.phone_secondary}</div>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{b.wilaya || "—"}</td>
                          <td className="px-4 py-3 text-end font-medium tabular-nums">{formatDzd(b.total_dzd)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5 items-start">
                              <StatusBadge status={b.status} />
                              {b.checked_in_at && (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-medium w-fit">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t("admin.checkedIn")}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-tight">
                                    {new Date(b.checked_in_at).toLocaleString("fr-DZ", { dateStyle: "short", timeStyle: "short" })}
                                    {b.checked_in_by && adminEmails[b.checked_in_by] && (
                                      <> · <span className="font-medium">{adminEmails[b.checked_in_by].split("@")[0]}</span></>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {b.voice_note_url && (
                                <a href={b.voice_note_url} target="_blank" rel="noreferrer" title="Voice note"
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-secondary">
                                  <Mic className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {b.receipt_url && (
                                <a href={b.receipt_url} target="_blank" rel="noreferrer" title="Receipt"
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-secondary">
                                  <Receipt className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {b.status !== "confirmed" && (
                                <button
                                  onClick={() => setStatus(b.id, "confirmed")}
                                  title={t("admin.markConfirmed")}
                                  className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium hover:bg-success/20"
                                >
                                  ✓
                                </button>
                              )}
                              {b.status !== "cancelled" && (
                                <button
                                  onClick={() => setStatus(b.id, "cancelled")}
                                  title={t("admin.markCancelled")}
                                  className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20"
                                >
                                  ✕
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmDelete(b)}
                                title={t("admin.delete")}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {dataLoading && (
                        <tr><td colSpan={8} className="px-4 py-12"><div className="flex justify-center"><Spinner size="lg" /></div></td></tr>
                      )}
                      {!dataLoading && filteredBookings.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-16 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary mb-3">
                              <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="font-medium">{t("admin.empty.title")}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t("admin.empty.sub")}</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cards — mobile / tablet */}
                <div className="lg:hidden space-y-3">
                  {dataLoading && (
                    <div className="rounded-2xl border border-border bg-card py-12 flex justify-center">
                      <Spinner size="lg" />
                    </div>
                  )}
                  {!dataLoading && filteredBookings.length === 0 && (
                    <div className="rounded-2xl border border-border bg-card py-14 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary mb-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="font-medium">{t("admin.empty.title")}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t("admin.empty.sub")}</div>
                    </div>
                  )}
                  {!dataLoading && filteredBookings.map((b) => (
                    <article
                      key={b.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-soft animate-fade-in"
                    >
                      <header className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-base font-semibold truncate">
                            {b.full_name}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            {b.tracking_code} · {new Date(b.created_at).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                        <StatusBadge status={b.status} />
                      </header>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{b.voyage_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {b.travelers} pers. · {b.wilaya || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <PhoneIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a href={`tel:${b.phone_primary}`} className="text-foreground hover:text-primary transition-colors" dir="ltr">
                            {b.phone_primary}
                          </a>
                          {b.phone_secondary && (
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              · {b.phone_secondary}
                            </span>
                          )}
                        </div>
                      </div>

                      {b.checked_in_at && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-[11px] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("admin.checkedIn")}
                          <span className="text-success/70">·</span>
                          <span className="text-success/80">
                            {new Date(b.checked_in_at).toLocaleString("fr-DZ", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      )}

                      <footer className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <div className="font-display text-base font-semibold tabular-nums">
                          {formatDzd(b.total_dzd)}
                        </div>
                        <div className="flex items-center gap-1">
                          {b.voice_note_url && (
                            <a href={b.voice_note_url} target="_blank" rel="noreferrer" title="Voice note"
                              className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-secondary">
                              <Mic className="h-4 w-4" />
                            </a>
                          )}
                          {b.receipt_url && (
                            <a href={b.receipt_url} target="_blank" rel="noreferrer" title="Receipt"
                              className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-secondary">
                              <Receipt className="h-4 w-4" />
                            </a>
                          )}
                          {b.status !== "confirmed" && (
                            <button
                              onClick={() => setStatus(b.id, "confirmed")}
                              title={t("admin.markConfirmed")}
                              className="h-9 px-3 rounded-full bg-success/10 text-success text-xs font-semibold hover:bg-success/20"
                            >
                              ✓
                            </button>
                          )}
                          {b.status !== "cancelled" && (
                            <button
                              onClick={() => setStatus(b.id, "cancelled")}
                              title={t("admin.markCancelled")}
                              className="h-9 px-3 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(b)}
                            title={t("admin.delete")}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </footer>
                    </article>
                  ))}
                </div>
              </>
            )}

            {tab === "voyages" && <AdminVoyages />}
            {tab === "hero" && <AdminHero />}
            {tab === "testimonials" && <AdminTestimonials />}
            {tab === "scan" && <AdminScan />}

            {tab === "blacklist" && (
              <div className="max-w-2xl">
                <div className="rounded-2xl border border-border bg-card p-5 mb-5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0X XX XX XX XX"
                      dir="ltr"
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                    <input
                      type="text"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      placeholder={t("admin.blacklist.reason")}
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                    <button
                      onClick={addBlacklist}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-medium hover:bg-primary-deep"
                    >
                      <Plus className="h-4 w-4" />
                      {t("admin.blacklist.add")}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                  {blacklist.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      {t("admin.blacklist.empty")}
                    </div>
                  )}
                  {blacklist.map((bl) => (
                    <div key={bl.id} className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <div className="font-mono font-medium" dir="ltr">{bl.phone}</div>
                        {bl.reason && <div className="text-xs text-muted-foreground mt-0.5">{bl.reason}</div>}
                      </div>
                      <button
                        onClick={() => removeBlacklist(bl.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {pdfBusy && <FullLoader overlay label={t("admin.pdf.generating")} sub={t("admin.pdf.generating.sub")} />}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
          onClick={() => deletingId ? null : setConfirmDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl shadow-card max-w-md w-[92%] p-6 md:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">{t("admin.delete.confirm.title")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("admin.delete.confirm.body")}
                </p>
                <div className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs">
                  <div className="font-mono">{confirmDelete.tracking_code}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {confirmDelete.full_name} · {confirmDelete.voyage_name}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary"
              >
                {t("admin.voyage.cancel")}
              </button>
              <button
                onClick={() => deleteBooking(confirmDelete.id)}
                disabled={!!deletingId}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {deletingId ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                {t("admin.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: Booking["status"] }) => {
  const cfg = {
    awaiting_payment: { label: "En attente", cls: "bg-warning/10 text-warning ring-warning/20" },
    confirmed: { label: "Confirmée", cls: "bg-success/10 text-success ring-success/20" },
    cancelled: { label: "Annulée", cls: "bg-destructive/10 text-destructive ring-destructive/20" },
  }[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const SelectChip = ({
  icon, value, onChange, options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="relative">
    <div className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
      {icon}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none h-10 ps-9 pe-8 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <svg className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  </div>
);

export default Admin;
