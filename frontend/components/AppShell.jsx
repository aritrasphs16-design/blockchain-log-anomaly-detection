"use client";

/**
 * Responsive application shell for the BLAD Security Console.
 *
 * Contract notes:
 *  - Routes are unchanged; the shell only provides chrome (nav + top bar).
 *  - The SSE provider still wraps everything, so `useSSE()` works anywhere.
 *  - `Sidebar` and `Topbar` keep their existing prop-free interfaces.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  // Escape key closes the drawer.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="shell">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {mobileNavOpen && (
        <div
          className="shell-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="shell-main">
        <Topbar onToggleNav={() => setMobileNavOpen((open) => !open)} />
        <main className="shell-canvas grid-bg">
          <div className="page">{children}</div>
        </main>
      </div>
    </div>
  );
}
