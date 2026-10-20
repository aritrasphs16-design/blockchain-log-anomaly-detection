"use client";

/**
 * Shared UI primitives for the BLAD Security Console.
 *
 * Every component here is purely presentational: no data fetching, no SSE
 * access and no side effects. Pages and feature components keep their own
 * props / data contracts — these helpers only provide consistent structure.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/* Panel                                                              */
/* ------------------------------------------------------------------ */

/**
 * @param {object}   props
 * @param {string}   props.title      Panel heading.
 * @param {string}   [props.subtitle] Secondary line under the heading.
 * @param {React.ReactNode} [props.icon] Leading icon in the heading.
 * @param {React.ReactNode} [props.actions] Right-aligned header controls.
 * @param {React.ReactNode} [props.footer]   Footer strip (bordered top).
 * @param {string}   [props.bodyClassName] Extra classes for the body region.
 * @param {boolean}  [props.flush]   Remove body padding.
 * @param {boolean}  [props.tight]   Reduce body padding.
 * @param {string}   [props.className] Extra classes on the panel root.
 * @param {object}   [props.style]   Inline styles on the panel root.
 */
export function Panel({
  title,
  subtitle,
  icon,
  actions,
  footer,
  children,
  bodyClassName = "",
  className = "",
  style,
  flush = false,
  tight = false,
}) {
  const hasHeader = Boolean(title || subtitle || actions || icon);

  return (
    <section className={`panel ${className}`.trim()} style={style}>
      {hasHeader && (
        <header className="panel-header">
          <div className="row row-2 grow" style={{ minWidth: 0 }}>
            {icon ? <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{icon}</span> : null}
            <div style={{ minWidth: 0 }}>
              {title ? <h3 className="panel-title">{title}</h3> : null}
              {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="row row-2 wrap">{actions}</div> : null}
        </header>
      )}

      <div
        className={
          "panel-body " +
          (flush ? "panel-body-flush " : "") +
          (tight ? "panel-body-tight " : "") +
          bodyClassName
        }
      >
        {children}
      </div>

      {footer ? <footer className="panel-footer">{footer}</footer> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param {object} props
 * @param {string} [props.eyebrow]    Small uppercase label above the title.
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} [props.actions]
 */
export function PageHeader({ eyebrow, title, description, icon, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {icon ? <span className="page-header-icon">{icon}</span> : null}
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-description">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatCard                                                           */
/* ------------------------------------------------------------------ */

const STAT_TONE_CLASS = {
  ok: "stat-ok",
  warn: "stat-warn",
  crit: "stat-crit",
  info: "stat-info",
  accent: "stat-accent",
  violet: "stat-violet",
  neutral: "stat-neutral",
};

/**
 * @param {object} props
 * @param {string} props.label
 * @param {React.ReactNode} props.value
 * @param {string} [props.meta]  Secondary line under the value.
 * @param {React.ReactNode} [props.icon]
 * @param {"ok"|"warn"|"crit"|"info"|"accent"|"violet"|"neutral"} [props.tone]
 * @param {boolean} [props.small] Use the compact value size.
 */
export function StatCard({ label, value, meta, icon, tone = "neutral", small = false, className = "" }) {
  return (
    <article className={`stat ${STAT_TONE_CLASS[tone] || ""} ${className}`.trim()}>
      <div className="stat-head">
        <p className="stat-label">{label}</p>
        {icon ? <span className="stat-icon">{icon}</span> : null}
      </div>
      <p className={`stat-value ${small ? "stat-value-sm" : ""}`.trim()}>{value}</p>
      {meta ? <p className="stat-meta">{meta}</p> : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                              */
/* ------------------------------------------------------------------ */

const BADGE_TONE_CLASS = {
  ok: "badge-ok",
  warn: "badge-warn",
  crit: "badge-crit",
  info: "badge-info",
  accent: "badge-accent",
  violet: "badge-violet",
  neutral: "badge-neutral",
};

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {"ok"|"warn"|"crit"|"info"|"accent"|"violet"|"neutral"} [props.tone]
 * @param {React.ReactNode} [props.icon]
 */
export function Badge({ children, tone = "neutral", icon, className = "" }) {
  return (
    <span className={`badge ${BADGE_TONE_CLASS[tone] || ""} ${className}`.trim()}>
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Field                                                              */
/* ------------------------------------------------------------------ */

/**
 * Label + control wrapper used across forms and filter toolbars.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {React.ReactNode} [props.children]  Control element.
 * @param {string} [props.hint]                Helper text under the control.
 * @param {React.ReactNode} [props.suffix]     Right-aligned adornment.
 */
export function Field({ label, children, hint, suffix, className = "" }) {
  return (
    <div className={`field ${className}`.trim()}>
      <div className="row between" style={{ gap: "0.5rem" }}>
        <label className="field-label">{label}</label>
        {suffix}
      </div>
      {children}
      {hint ? (
        <p className="stat-meta" style={{ marginTop: "0.125rem" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param {object} props
 * @param {React.ReactNode} [props.icon]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]
 */
export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {icon}
      <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{title}</p>
      {description ? <p style={{ maxWidth: "44ch" }}>{description}</p> : null}
      {action ? <div style={{ marginTop: "0.5rem" }}>{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                             */
/* ------------------------------------------------------------------ */

const BUTTON_VARIANT_CLASS = {
  primary: "btn-primary",
  danger: "btn-danger",
  ghost: "btn-ghost",
  default: "",
};

/**
 * @param {object} props
 * @param {string} [props.href]     Renders a Next.js <Link> instead of <button>.
 * @param {"primary"|"danger"|"ghost"|"default"} [props.variant]
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {React.ReactNode} [props.icon]
 */
export function Button({
  href,
  variant = "default",
  size = "md",
  icon,
  iconAfter,
  children,
  className = "",
  ...rest
}) {
  const classes = [
    "btn",
    BUTTON_VARIANT_CLASS[variant] || "",
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon}
      {children}
      {iconAfter}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* LiveDot                                                            */
/* ------------------------------------------------------------------ */

/**
 * Small pulsing status indicator.
 *
 * @param {object} props
 * @param {"live"|"warn"|"crit"|"idle"} [props.tone]
 */
export function LiveDot({ tone = "live" }) {
  const colorMap = {
    live: "var(--ok)",
    warn: "var(--warn)",
    crit: "var(--crit)",
    idle: "var(--text-faint)",
  };

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        flexShrink: 0,
        background: colorMap[tone] || colorMap.live,
        boxShadow: tone === "live" ? `0 0 8px ${colorMap[tone]}` : "none",
        animation: tone === "live" ? "livePulse 2s ease-in-out infinite" : "none",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Modal (Portaled dialog overlay)                                    */
/* ------------------------------------------------------------------ */

/**
 * Portaled modal dialog rendered directly to document.body.
 * Ensures the popup is always centered in the viewport and never requires scrolling down.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} [props.onClose]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function Modal({ isOpen, onClose, children, className = "" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className={`w-full max-h-[90vh] overflow-y-auto ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

