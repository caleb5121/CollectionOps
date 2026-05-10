"use client";

export default function Card({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-warm)_88%,transparent)] bg-[var(--surface-raised)] shadow-[var(--shadow-card-lift)] transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-[color-mix(in_oklab,var(--border-warm)_78%,transparent)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_6px_20px_-8px_rgba(0,0,0,0.38)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[color:color-mix(in_oklab,var(--accent)_22%,var(--border-warm))] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,var(--shadow-card-hover),0_12px_36px_-14px_rgba(26,155,127,0.08)] dark:[@media(hover:hover)_and_(pointer:fine)]:hover:border-[color:color-mix(in_oklab,var(--accent)_25%,var(--border-warm))] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
