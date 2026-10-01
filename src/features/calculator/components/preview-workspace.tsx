"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

/** One modal surface for the shared scene, outside every calculator layout. */
export function PreviewWorkspace({ children, onClose, ariaLabel }: {
  children: ReactNode;
  onClose: () => void;
  ariaLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { t, direction } = useI18n();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bodyStyle = body.getAttribute("style");
    const htmlOverflow = html.style.overflow;
    const scrollBehaviour = html.style.scrollBehavior;
    const siblings = Array.from(body.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== root,
    ).map((element) => ({ element, inert: element.inert }));

    // Fixed body preserves the page's scroll offset on iOS as well as desktop.
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.left = `${-scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    siblings.forEach(({ element }) => { element.inert = true; });

    const viewport = window.visualViewport;
    let frame = 0;
    const measure = () => {
      root.style.setProperty("--viewer-width", `${viewport?.width ?? window.innerWidth}px`);
      root.style.setProperty("--viewer-height", `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty("--viewer-top", `${viewport?.offsetTop ?? 0}px`);
      root.style.setProperty("--viewer-left", `${viewport?.offsetLeft ?? 0}px`);
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);

    root.querySelector<HTMLButtonElement>("[data-preview-close]")?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), [href], [tabindex="0"], summary',
      )).filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    window.addEventListener("keydown", keyboard, true);
    return () => {
      if (document.fullscreenElement === root) void document.exitFullscreen().catch(() => {});
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyboard, true);
      siblings.forEach(({ element, inert }) => { element.inert = inert; });
      if (bodyStyle === null) body.removeAttribute("style");
      else body.setAttribute("style", bodyStyle);
      html.style.overflow = htmlOverflow;
      html.style.scrollBehavior = "auto";
      window.scrollTo(scrollX, scrollY);
      focus?.focus({ preventScroll: true });
      html.style.scrollBehavior = scrollBehaviour;
    };
  }, [onClose]);

  return createPortal(
    <div ref={rootRef} className="three-workspace" role="dialog" aria-modal="true" aria-label={ariaLabel ?? t("preview.title")} dir={direction}>
      {children}
    </div>,
    document.body,
  );
}
