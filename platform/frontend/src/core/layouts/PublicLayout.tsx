import type { ReactNode } from "react";
import { PublicHeader } from "../../public/components/PublicHeader";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div data-layout="public" className="public-layout">
      <PublicHeader />
      <main className="public-layout__content">{children}</main>
    </div>
  );
}
