"use client";

export default function Card({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-warm)_72%,transparent)] bg-[color-mix(in_oklab,var(--surface-raised)_100%,var(--surface-muted))] shadow-[var(--shadow-card-lift)] transition-[border-color,box-shadow,transform] duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] before:opacity-[0.85] before:content-[''] dark:border-[color-mix(in_oklab,var(--border-warm)_65%,transparent)] dark:bg-[linear-gradient(168deg,color-mix(in_oklab,var(--surface-raised)_100%,transparent)_0%,color-mix(in_oklab,var(--surface-muted)_40%,var(--surface-raised))_100%)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_6px_22px_-8px_rgba(0,0,0,0.38)] dark:before:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:before:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[color:color-mix(in_oklab,var(--accent)_26%,var(--border-warm))] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[var(--shadow-card-glow-accent)] dark:[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_28px_-6px_rgba(0,0,0,0.55),0_0_40px_-12px_var(--accent-glow)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
