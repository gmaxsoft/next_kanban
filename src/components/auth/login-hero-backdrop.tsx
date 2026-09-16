"use client";

export function LoginHeroBackdrop() {
  return (
    <div aria-hidden className="login-hero-motion pointer-events-none absolute inset-0">
      <div className="login-hero-wash absolute inset-0" />
      <div className="login-hero-grid absolute inset-0 opacity-90" />
      <div className="login-hero-glow login-hero-glow-a absolute -top-24 -left-16 size-[22rem] rounded-full" />
      <div className="login-hero-glow login-hero-glow-b absolute right-[-6rem] bottom-[-4rem] size-[26rem] rounded-full" />

      <div className="login-hero-square login-hero-square-lg absolute -right-24 -bottom-24 size-[28rem] border border-white/15" />
      <div className="login-hero-square login-hero-square-md absolute right-16 bottom-28 size-40 border border-[#c9a227]/55" />
      <div className="login-hero-square login-hero-square-sm absolute top-24 right-[28%] size-24 border border-white/20" />
      <div className="login-hero-square login-hero-square-xs absolute top-[42%] left-[12%] size-14 border border-[#c9a227]/35" />
    </div>
  );
}
