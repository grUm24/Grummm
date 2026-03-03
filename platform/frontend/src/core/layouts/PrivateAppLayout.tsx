import type { ReactNode } from "react";

interface PrivateAppLayoutProps {
  children: ReactNode;
}

export function PrivateAppLayout({ children }: PrivateAppLayoutProps) {
  return (
    <div data-layout="private-app" className="private-layout">
      <header>
        <strong>Private App</strong>
      </header>
      <div className="private-layout__shell">
        <aside>App Navigation</aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
