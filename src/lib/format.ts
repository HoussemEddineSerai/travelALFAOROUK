export const formatDzd = (n: number, lang: string = "fr") => {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} DZD`;
  }
};
