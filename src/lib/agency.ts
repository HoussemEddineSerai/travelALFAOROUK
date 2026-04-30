// Customer-facing constants
export const AGENCY = {
  name: "Alfarouk Voyage",
  phone: "+213 770 00 00 00",
  email: "contact@alfaroukvoyage.dz",
  address: "Rue des Voyages, Alger, Algérie",
  baridiMob: "00799999000123456789",
  ccp: "1234567 89 / clé 12",
  ccpName: "ALFAROUK VOYAGE SARL",
};

export const generateTrackingCode = () => {
  // Short, human-friendly: AF-XXXX-XXXX (no ambiguous chars)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `AF-${pick(4)}-${pick(4)}`;
};
