import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

function bindHeroParallax(stage: HTMLElement) {
  const hero = stage.closest(".hero");
  if (!(hero instanceof HTMLElement)) {
    return () => {};
  }

  const cube = stage.querySelector<HTMLElement>(".hero__scene-cube");
  const glow = stage.querySelector<HTMLElement>(".hero__scene-glow");

  if (!cube || !glow) {
    return () => {};
  }

  cube.style.willChange = "transform";
  glow.style.willChange = "transform";

  gsap.set(cube, {
    transformPerspective: 1000,
    transformOrigin: "50% 58%"
  });

  const onMove = (event: PointerEvent) => {
    const rect = hero.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    const cubeX = gsap.utils.clamp(-10, 10, px * 20);
    const cubeY = gsap.utils.clamp(-7, 7, py * 14);
    const rotationY = gsap.utils.clamp(-4.5, 4.5, px * 9);
    const rotationX = gsap.utils.clamp(-3.5, 3.5, -py * 7);
    const glowX = gsap.utils.clamp(-14, 14, px * -18);
    const glowY = gsap.utils.clamp(-10, 10, py * -12);

    gsap.to(cube, {
      x: cubeX,
      y: cubeY,
      rotationY,
      rotationX,
      duration: 0.42,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });

    gsap.to(glow, {
      x: glowX,
      y: glowY,
      duration: 0.62,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });
  };

  const onLeave = () => {
    gsap.killTweensOf(cube);
    gsap.killTweensOf(glow);

    gsap.to(cube, {
      x: 0,
      y: 0,
      rotationY: 0,
      rotationX: 0,
      duration: 0.65,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });

    gsap.to(glow, {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
      overwrite: true,
      force3D: true
    });
  };

  hero.addEventListener("pointermove", onMove);
  hero.addEventListener("pointerleave", onLeave);
  hero.addEventListener("pointercancel", onLeave);

  return () => {
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
    hero.removeEventListener("pointercancel", onLeave);
    gsap.killTweensOf(cube);
    gsap.killTweensOf(glow);
    cube.style.willChange = "auto";
    glow.style.willChange = "auto";
    gsap.set(cube, { clearProps: "transform,transformPerspective,transformOrigin" });
    gsap.set(glow, { clearProps: "transform" });
  };
}

function bindPostBlockReveal(node: HTMLElement, index: number) {
  node.style.willChange = "transform, opacity, filter";
  gsap.set(node, {
    autoAlpha: 0,
    y: 22,
    filter: "blur(10px)"
  });

  const tween = gsap.to(node, {
    autoAlpha: 1,
    y: 0,
    filter: "blur(0px)",
    duration: 0.52,
    delay: Math.min(index * 0.04, 0.14),
    ease: "power3.out",
    paused: true,
    overwrite: true,
    force3D: true
  });

  const trigger = ScrollTrigger.create({
    trigger: node,
    start: "top 86%",
    once: true,
    onEnter: () => tween.restart()
  });

  return () => {
    trigger.kill();
    tween.kill();
    node.style.willChange = "auto";
    gsap.set(node, { clearProps: "opacity,transform,filter" });
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
    const isCoarsePointer =
      typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

    if (prefersReducedMotion) {
      gsap.set("[data-gsap='reveal']", { clearProps: "all" });
      gsap.set("[data-gsap='stagger'] > *", { clearProps: "all" });
      gsap.set("[data-gsap-post-block]", { clearProps: "all" });
      return;
    }

    const cleanupButtons: Array<() => void> = [];
    const cleanupHeroScenes: Array<() => void> = [];
    const cleanupPostBlocks: Array<() => void> = [];

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

      if (!isCoarsePointer) {
        const postBlocks = gsap.utils.toArray<HTMLElement>("[data-gsap-post-block]", root);
        postBlocks.forEach((block, index) => cleanupPostBlocks.push(bindPostBlockReveal(block, index)));
      } else {
        gsap.set("[data-gsap-post-block]", { clearProps: "all" });
      }

      if (supportsDesktopHover) {
        const heroScenes = gsap.utils.toArray<HTMLElement>("[data-gsap-hero-parallax]", root);
        heroScenes.forEach((stage) => cleanupHeroScenes.push(bindHeroParallax(stage)));
      }
    }, root);

    return () => {
      cleanupButtons.forEach((cleanup) => cleanup());
      cleanupHeroScenes.forEach((cleanup) => cleanup());
      cleanupPostBlocks.forEach((cleanup) => cleanup());
      ctx.revert();
    };
  }, deps);
}
