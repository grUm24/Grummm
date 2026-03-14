import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode
} from "react";

type LiquidGlassProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function LiquidGlass<T extends ElementType = "div">({
  as,
  children,
  className,
  interactive = false,
  ...props
}: LiquidGlassProps<T>) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      className={[
        "liquid-glass",
        interactive ? "liquid-glass--interactive" : "",
        className ?? ""
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content">{children}</div>
    </Component>
  );
}