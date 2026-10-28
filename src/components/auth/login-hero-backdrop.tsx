"use client";

function OutlineCircle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="50" cy="50" r="46" />
    </svg>
  );
}

function OutlineTriangle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 90"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M50 6 L94 82 H6 Z" />
    </svg>
  );
}

export function LoginHeroBackdrop() {
  return (
    <div
      aria-hidden
      className="login-hero-motion pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="login-hero-wash absolute inset-0" />
      <div className="login-hero-grid absolute inset-0 opacity-60" />

      <OutlineCircle className="login-hero-shape login-hero-circle-a absolute top-[12%] left-[10%] size-56 text-white/55" />
      <OutlineCircle className="login-hero-shape login-hero-circle-b absolute right-[8%] bottom-[16%] size-40 text-[#c9a227]" />

      <OutlineTriangle className="login-hero-shape login-hero-triangle-a absolute top-[20%] right-[16%] size-44 text-[#c9a227]/85" />
      <OutlineTriangle className="login-hero-shape login-hero-triangle-b absolute bottom-[20%] left-[12%] size-32 text-white/45" />
      <OutlineTriangle className="login-hero-shape login-hero-triangle-c absolute top-[52%] left-[40%] size-24 text-[#c9a227]/55" />
    </div>
  );
}
