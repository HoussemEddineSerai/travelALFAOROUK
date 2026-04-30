import QRCode from "qrcode";

export const buildTrackingUrl = (code: string) =>
  `${window.location.origin}/track/${code}`;

export const generateQrDataUrl = async (text: string, size = 320): Promise<string> => {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b1830", light: "#ffffff" },
  });
};
