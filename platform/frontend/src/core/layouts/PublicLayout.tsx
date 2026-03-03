import type { ReactNode } from "react";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div data-layout="public" className="public-layout">
      <main className="public-layout__content">{children}</main>
    </div>
  );
}
