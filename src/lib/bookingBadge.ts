// Generate a downloadable digital booking badge (boarding-pass style)
// Renders to an HTMLCanvasElement at 2x resolution for crisp output on mobile.

import { generateQrDataUrl, buildTrackingUrl } from "@/lib/qr";
import { AGENCY } from "@/lib/agency";

export type BadgeTripType = "excursion" | "organise";

export interface BadgeData {
  trackingCode: string;
  fullName: string;
  voyageName: string;
  tripType: BadgeTripType;
  travelers: number;
  pickupPoint?: string;
  wilaya?: string;
  totalDzd?: number;
  lang: "fr" | "ar";
}

const labels = {
  fr: {
    boarding: "BOARDING PASS",
    passenger: "PASSAGER",
    booking: "RÉFÉRENCE",
    trip: "VOYAGE",
    type: "TYPE",
    pax: "PAX",
    pickup: "DÉPART",
    scan: "SCANNEZ POUR L'ENREGISTREMENT",
    excursion: "EXCURSION",
    organise: "VOYAGE ORGANISÉ",
    footer: "Présentez ce badge au point de rendez-vous",
  },
  ar: {
    boarding: "بطاقة الصعود",
    passenger: "المسافر",
    booking: "المرجع",
    trip: "الرحلة",
    type: "النوع",
    pax: "الأفراد",
    pickup: "الانطلاق",
    scan: "امسح للتسجيل",
    excursion: "نزهة",
    organise: "رحلة منظمة",
    footer: "اعرض هذه البطاقة في نقطة الالتقاء",
  },
} as const;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

export const renderBadgeToBlob = async (data: BadgeData): Promise<Blob> => {
  const L = labels[data.lang];
  const isAr = data.lang === "ar";

  // Logical size (boarding-pass proportions, portrait, mobile-friendly)
  const W = 720;
  const H = 1120;
  const scale = 2; // export 2x resolution

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  (ctx as any).textRendering = "geometricPrecision";

  // Brand palette (must match index.css spirit)
  const ink = "#0B1830";
  const inkSoft = "#1F2A44";
  const accent = "#C9A24A"; // warm gold
  const paper = "#FFFFFF";
  const cream = "#F7F4EC";
  const muted = "#6B7280";
  const line = "#E6E2D6";

  // Outer background
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, W, H);

  // Card
  const padding = 28;
  const cardX = padding;
  const cardY = padding;
  const cardW = W - padding * 2;
  const cardH = H - padding * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = paper;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  // Header band
  const headerH = 110;
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, headerH, 28);
  ctx.clip();
  ctx.fillStyle = ink;
  ctx.fillRect(cardX, cardY, cardW, headerH);
  // gold accent strip
  ctx.fillStyle = accent;
  ctx.fillRect(cardX, cardY + headerH - 4, cardW, 4);
  ctx.restore();

  // Header text
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "700 18px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(AGENCY.name.toUpperCase(), cardX + 28, cardY + headerH / 2 - 10);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.letterSpacing = "2px" as any;
  ctx.fillText(L.boarding, cardX + 28, cardY + headerH / 2 + 12);

  // Type chip (right)
  const chipText = data.tripType === "excursion" ? L.excursion : L.organise;
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  const chipW = ctx.measureText(chipText).width + 28;
  const chipH = 28;
  const chipX = cardX + cardW - 28 - chipW;
  const chipY = cardY + headerH / 2 - chipH / 2;
  ctx.fillStyle = accent;
  roundRect(ctx, chipX, chipY, chipW, chipH, 14);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(chipText, chipX + chipW / 2, chipY + chipH / 2 + 1);

  // Body content
  let cy = cardY + headerH + 32;
  const innerX = cardX + 32;
  const innerW = cardW - 64;

  // Passenger name (large)
  ctx.fillStyle = muted;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(L.passenger, innerX, cy);
  cy += 8;
  ctx.fillStyle = ink;
  ctx.font = "700 30px ui-serif, Georgia, 'Times New Roman', serif";
  const nameLine = data.fullName.toUpperCase();
  const maxNameW = innerW;
  let nameSize = 30;
  while (ctx.measureText(nameLine).width > maxNameW && nameSize > 18) {
    nameSize -= 1;
    ctx.font = `700 ${nameSize}px ui-serif, Georgia, serif`;
  }
  cy += nameSize;
  ctx.fillText(nameLine, innerX, cy);
  cy += 28;

  // Two columns: Trip + Booking ref
  const colW = innerW / 2;
  // Trip
  ctx.fillStyle = muted;
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(L.trip, innerX, cy);
  // Booking ref
  ctx.fillText(L.booking, innerX + colW, cy);
  cy += 22;
  ctx.fillStyle = ink;
  ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
  // Trip name truncate
  let tripText = data.voyageName;
  while (ctx.measureText(tripText).width > colW - 16 && tripText.length > 4) {
    tripText = tripText.slice(0, -2);
  }
  if (tripText !== data.voyageName) tripText = tripText.replace(/.$/, "…");
  ctx.fillText(tripText, innerX, cy);
  ctx.font = "700 18px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.fillStyle = ink;
  ctx.fillText(data.trackingCode, innerX + colW, cy);
  cy += 28;

  // Dashed separator
  ctx.save();
  ctx.strokeStyle = line;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, cy);
  ctx.lineTo(innerX + innerW, cy);
  ctx.stroke();
  ctx.restore();
  cy += 24;

  // Pax + Pickup row
  ctx.fillStyle = muted;
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(L.pax, innerX, cy);
  ctx.fillText(L.pickup, innerX + colW, cy);
  cy += 20;
  ctx.fillStyle = ink;
  ctx.font = "700 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(String(data.travelers).padStart(2, "0"), innerX, cy);
  ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
  let pickup = [data.pickupPoint, data.wilaya].filter(Boolean).join(" · ");
  if (!pickup) pickup = "—";
  while (ctx.measureText(pickup).width > colW - 16 && pickup.length > 4) {
    pickup = pickup.slice(0, -2);
  }
  if (pickup.endsWith("…") === false && pickup !== "—" && (data.pickupPoint || "").length > pickup.length) {
    pickup = pickup.replace(/.$/, "…");
  }
  ctx.fillText(pickup, innerX + colW, cy);
  cy += 36;

  // QR area (cream block)
  const qrBlockH = 320;
  const qrBlockY = cy;
  ctx.fillStyle = cream;
  roundRect(ctx, innerX, qrBlockY, innerW, qrBlockH, 20);
  ctx.fill();

  // Generate QR
  const qrUrl = buildTrackingUrl(data.trackingCode);
  const qrDataUrl = await generateQrDataUrl(qrUrl, 600);
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 220;
  const qrX = innerX + (innerW - qrSize) / 2;
  const qrY = qrBlockY + 28;
  // White card behind QR
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 14);
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Scan label
  ctx.fillStyle = inkSoft;
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(L.scan, innerX + innerW / 2, qrY + qrSize + 36);
  ctx.fillStyle = muted;
  ctx.font = "500 11px ui-monospace, monospace";
  ctx.fillText(qrUrl.replace(/^https?:\/\//, ""), innerX + innerW / 2, qrY + qrSize + 56);

  cy = qrBlockY + qrBlockH + 24;

  // Footer (perforated edge feel)
  ctx.save();
  ctx.strokeStyle = line;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(innerX, cy);
  ctx.lineTo(innerX + innerW, cy);
  ctx.stroke();
  ctx.restore();
  cy += 22;

  ctx.fillStyle = muted;
  ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = isAr ? "right" : "left";
  ctx.direction = (isAr ? "rtl" : "ltr") as any;
  ctx.fillText(L.footer, isAr ? innerX + innerW : innerX, cy);
  ctx.textAlign = isAr ? "left" : "right";
  ctx.fillText(AGENCY.phone, isAr ? innerX : innerX + innerW, cy);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
      1,
    );
  });
};

export const downloadBadge = async (data: BadgeData) => {
  const blob = await renderBadgeToBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alfarouk-badge-${data.trackingCode}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
