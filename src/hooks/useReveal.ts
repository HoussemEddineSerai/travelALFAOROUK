import { useEffect, useRef } from "react";

/**
 * IntersectionObserver-based reveal: adds `is-visible` once an element enters the viewport.
 * Use with the `.reveal` utility class. Runs once per element.
 */
export const useReveal = <T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
};
