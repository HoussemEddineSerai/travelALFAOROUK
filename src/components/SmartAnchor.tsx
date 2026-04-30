import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

const HEADER_OFFSET = 88; // sticky header height
const FILTER_HASHES = new Set(["#excursions", "#voyages-organises"]);

const scrollToHash = (hash: string) => {
  // Map filter hashes to the voyages section element
  const targetId = FILTER_HASHES.has(hash)
    ? "voyages"
    : hash.replace(/^#/, "") || "top";
  const el = document.getElementById(targetId);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  } else if (targetId === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

/**
 * Smart in-page anchor that:
 *  - Works from sub-routes by navigating back to "/" first
 *  - Smooth-scrolls with sticky header offset
 *  - Updates the URL hash so deep-links/share still work
 *  - Dispatches voyages:search for filter hashes so the section updates filter
 */
export const SmartAnchor = forwardRef<HTMLAnchorElement, Props>(
  ({ href, onClick, children, ...rest }, ref) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // Allow modified clicks / new tabs
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button ?? 0) !== 0) return;
      if (!href.startsWith("#")) return;
      e.preventDefault();
      onClick?.(e);

      const go = () => {
        // Filter hashes: also notify voyages section to apply filter
        if (FILTER_HASHES.has(href)) {
          const kind = href === "#excursions" ? "excursion" : "organise";
          window.dispatchEvent(
            new CustomEvent("voyages:search", { detail: { kind, q: "" } }),
          );
        }
        history.replaceState(null, "", href);
        scrollToHash(href);
      };

      if (location.pathname !== "/") {
        navigate("/" + href);
        // Wait for next paint so target exists
        setTimeout(go, 80);
      } else {
        go();
      }
    };

    return (
      <a ref={ref} href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  },
);
SmartAnchor.displayName = "SmartAnchor";
