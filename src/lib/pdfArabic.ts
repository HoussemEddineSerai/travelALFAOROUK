// Lazy loader + helper for rendering Arabic text in jsPDF.
// Fetches the Amiri Regular TTF (Google Fonts), registers it with the doc,
// and applies contextual reshaping so isolated Arabic letters connect properly.
import type jsPDF from "jspdf";
import { ArabicShaper } from "arabic-persian-reshaper";

const FONT_URL =
  "https://cdn.jsdelivr.net/gh/aliftype/amiri@1.000/fonts/ttf/Amiri-Regular.ttf";

let cachedBase64: string | null = null;

const arrayBufferToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
};

export const loadArabicFont = async (): Promise<string> => {
  if (cachedBase64) return cachedBase64;
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error("Failed to load Arabic font");
  const buf = await res.arrayBuffer();
  cachedBase64 = arrayBufferToBase64(buf);
  return cachedBase64;
};

export const registerArabicFont = (doc: jsPDF, base64: string) => {
  doc.addFileToVFS("Amiri-Regular.ttf", base64);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
};

// Reshape + reverse so jsPDF prints right-to-left correctly.
export const shapeArabic = (text: string): string => {
  if (!text) return "";
  const shaped = ArabicShaper.convertArabic(text);
  // Reverse so the visual order matches RTL when drawn left-to-right by jsPDF.
  return shaped.split("").reverse().join("");
};
