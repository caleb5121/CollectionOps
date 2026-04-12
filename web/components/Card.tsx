"use client";

export default function Card({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`app-card-3d rounded-2xl border border-slate-200/80 bg-white/92 p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_12px_40px_-16px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-app hover:-translate-y-1 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] active:translate-y-0 active:scale-[0.998] dark:border-slate-700/75 dark:bg-slate-900/78 dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
