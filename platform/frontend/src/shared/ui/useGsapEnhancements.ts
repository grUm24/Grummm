import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";

const SURFACE_SELECTOR = [
  ".public-header__shell",
  ".public-nav",
  ".public-preferences",
  ".catalog-header",
  ".detail-header",
  ".about-section",
  ".project-card",
  ".private-layout__topbar",
  ".private-layout__aside",
  ".admin-card",
  ".admin-panel",
  ".auth-card",
  ".module-public-card",
  ".auth-reauth-modal"
].join(", ");

function bindButtonMotion(button: HTMLElement) {
  button.style.transformOrigin = "50% 50%";
  button.style.willChange = "transform, box-shadow";

  const onEnter = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      y: -2,
      scale: 1.01,
      duration: 0.28,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });
  };

  const onLeave = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      y: 0,
      scale: 1,
      duration: 0.34,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });
  };

  const onDown = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      y: 0,
      scale: 0.985,
      duration: 0.14,
      ease: "power2.out",
      overwrite: true,
      force3D: true
    });
  };

  const onUp = () => {
    gsap.killTweensOf(button);
    gsap.to(button, {
      y: -2,
      scale: 1.01,
      duration: 0.2,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });
  };

  button.addEventListener("pointerenter", onEnter);
  button.addEventListener("pointerleave", onLeave);
  button.addEventListener("pointerdown", onDown);
  button.addEventListener("pointerup", onUp);
  button.addEventListener("pointercancel", onLeave);

  return () => {
    button.style.willChange = "auto";
    button.removeEventListener("pointerenter", onEnter);
    button.removeEventListener("pointerleave", onLeave);
    button.removeEventListener("pointerdown", onDown);
    button.removeEventListener("pointerup", onUp);
    button.removeEventListener("pointercancel", onLeave);
  };
}

function bindSurfaceGlow(surface: HTMLElement) {
  surface.style.setProperty("--surface-glow-x", "50%");
  surface.style.setProperty("--surface-glow-y", "50%");
  surface.style.setProperty("--surface-glow-opacity", "0");

  const updatePointer = (event: PointerEvent) => {
    const rect = surface.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    surface.style.setProperty("--surface-glow-x", `${x}%`);
    surface.style.setProperty("--surface-glow-y", `${y}%`);
  };

  const onEnter = (event: PointerEvent) => {
    updatePointer(event);
    gsap.killTweensOf(surface);
    gsap.to(surface, {
      "--surface-glow-opacity": 1,
      duration: 0.22,
      ease: "power2.out",
      overwrite: true
    });
  };

  const onMove = (event: PointerEvent) => {
    updatePointer(event);
  };

  const onLeave = () => {
    gsap.killTweensOf(surface);
    gsap.to(surface, {
      "--surface-glow-opacity": 0,
      duration: 0.34,
      ease: "power3.out",
      overwrite: true
    });
  };

  surface.addEventListener("pointerenter", onEnter);
  surface.addEventListener("pointermove", onMove);
  surface.addEventListener("pointerleave", onLeave);
  surface.addEventListener("pointercancel", onLeave);

  return () => {
    surface.removeEventListener("pointerenter", onEnter);
    surface.removeEventListener("pointermove", onMove);
    surface.removeEventListener("pointerleave", onLeave);
    surface.removeEventListener("pointercancel", onLeave);
    surface.style.removeProperty("--surface-glow-x");
    surface.style.removeProperty("--surface-glow-y");
    surface.style.removeProperty("--surface-glow-opacity");
  };
}

export function useGsapEnhancements(rootRef: RefObject<HTMLElement>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const supportsDesktopHover =
      typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine) and (min-width: 960px)").matches;

    if (prefersReducedMotion) {
      gsap.set("[data-gsap='reveal']", { clearProps: "all" });
      gsap.set("[data-gsap='stagger'] > *", { clearProps: "all" });
      return;
    }

    const cleanupButtons: Array<() => void> = [];
    const cleanupSurfaces: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const revealNodes = gsap.utils.toArray<HTMLElement>("[data-gsap='reveal']", root);
      revealNodes.forEach((node, index) => {
        gsap.fromTo(
          node,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.36,
            delay: index * 0.03,
            ease: "power2.out",
            clearProps: "opacity,transform"
          }
        );
      });

      const staggerGroups = gsap.utils.toArray<HTMLElement>("[data-gsap='stagger']", root);
      staggerGroups.forEach((group) => {
        const children = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
        if (children.length === 0) {
          return;
        }

        gsap.fromTo(
          children,
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.045,
            ease: "power2.out",
            clearProps: "opacity,transform"
          }
        );
      });

      const buttons = gsap.utils.toArray<HTMLElement>("[data-gsap-button]", root);
      buttons.forEach((button) => cleanupButtons.push(bindButtonMotion(button)));

      if (supportsDesktopHover) {
        const surfaces = gsap.utils.toArray<HTMLElement>(SURFACE_SELECTOR, root);
        surfaces.forEach((surface) => cleanupSurfaces.push(bindSurfaceGlow(surface)));
      }
    }, root);

    return () => {
      cleanupButtons.forEach((cleanup) => cleanup());
      cleanupSurfaces.forEach((cleanup) => cleanup());
      ctx.revert();
    };
  }, deps);
}
