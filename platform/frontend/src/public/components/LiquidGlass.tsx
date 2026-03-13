import {
  useMemo,
  type ComponentPropsWithoutRef,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";

type LiquidGlassProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

function applyPointerState(element: HTMLElement, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect();
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const xRatio = rect.width > 0 ? x / rect.width : 0.5;
  const yRatio = rect.height > 0 ? y / rect.height : 0.5;
  const rotateY = (xRatio - 0.5) * 6;
  const rotateX = (yRatio - 0.5) * -6;

  element.dataset.tracking = "true";
  element.style.setProperty("--glass-x", `${(xRatio * 100).toFixed(2)}%`);
  element.style.setProperty("--glass-y", `${(yRatio * 100).toFixed(2)}%`);
  element.style.setProperty("--glass-rx", `${rotateX.toFixed(2)}deg`);
  element.style.setProperty("--glass-ry", `${rotateY.toFixed(2)}deg`);
  element.style.setProperty("--glass-active", "1");
}

function resetPointerState(element: HTMLElement) {
  delete element.dataset.tracking;
  element.style.setProperty("--glass-rx", "0deg");
  element.style.setProperty("--glass-ry", "0deg");
  element.style.setProperty("--glass-active", "0");
}

export function LiquidGlass<T extends ElementType = "div">({
  as,
  children,
  className,
  interactive = true,
  ...props
}: LiquidGlassProps<T>) {
  const Component = (as ?? "div") as ElementType;
  const canHover = useMemo(
    () => (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false,
    []
  );

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    applyPointerState(event.currentTarget, event.clientX, event.clientY);
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLElement>) {
    resetPointerState(event.currentTarget);
  }

  return (
    <Component
      className={[
        "liquid-glass",
        interactive && canHover ? "liquid-glass--interactive" : "",
        className ?? ""
      ].filter(Boolean).join(" ")}
      onPointerMove={interactive && canHover ? handlePointerMove : undefined}
      onPointerEnter={interactive && canHover ? handlePointerMove : undefined}
      onPointerLeave={interactive && canHover ? handlePointerLeave : undefined}
      {...props}
    >
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content">{children}</div>
    </Component>
  );
}
