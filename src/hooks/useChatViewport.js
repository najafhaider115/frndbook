import { useEffect, useState } from "react";

/** Fit the mobile chat to the visible area when an on-screen keyboard overlays the layout. */
export function useChatViewport() {
  const [element, setElement] = useState(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!element || !viewport) return;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth > 800 || viewport.scale !== 1) {
          element.style.removeProperty("--chat-available-height");
          return;
        }
        const available = Math.max(0, viewport.height + viewport.offsetTop - element.getBoundingClientRect().top);
        element.style.setProperty("--chat-available-height", `${available}px`);
      });
    };
    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      element.style.removeProperty("--chat-available-height");
    };
  }, [element]);
  return setElement;
}
