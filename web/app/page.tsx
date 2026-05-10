"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, type RefObject } from "react";

import { useAuth } from "@/components/AuthProvider";
import LandingBenefits from "@/components/landing/LandingBenefits";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import FeedbackFloatingButton from "@/components/shell/FeedbackFloatingButton";

const trackedCards = [
  { src: "/landing-cards/magic.png", alt: "Magic sample card" },
  { src: "/landing-cards/pokemon.png", alt: "Pokémon sample card" },
  { src: "/landing-cards/yugioh.png", alt: "Yu-Gi-Oh sample card" },
  { src: "/landing-cards/one-piece.png", alt: "One Piece sample card" },
  { src: "/landing-cards/lorcana.png", alt: "Disney Lorcana sample card" },
  { src: "/landing-cards/digimon.png", alt: "Digimon sample card" },
  { src: "/landing-cards/starwars.png", alt: "Star Wars Unlimited sample card" },
  { src: "/landing-cards/flesh-and-blood.png", alt: "Flesh and Blood sample card" },
] as const;

/** Intentional ease-out - see DESIGN.md / emil-design-eng */
const easeOut = [0.23, 1, 0.32, 1] as const;

/** Full-bleed hero panel: fills parent, cover + right bias; optional scroll parallax on image. */
function HeroVisual({
  animate,
  heroRef,
}: {
  animate: boolean;
  heroRef: RefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], reduce || !animate ? [0, 0] : [0, -14]);

  return (
    <motion.div
      className="absolute inset-0 flex h-full w-full min-h-[min(52vw,20rem)] items-center justify-center overflow-hidden lg:min-h-0"
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay: 0.06, ease: easeOut }}
    >
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: imageY }}>
        <Image
          src="/landing-hero-dashboard.png"
          alt="Seller using CollectionOps on a tablet - dashboard with profit, fees, and insights"
          fill
          className="h-full w-full object-cover object-center sm:object-[50%_42%]"
          sizes="(max-width: 1023px) 100vw, 50vw"
          priority
          quality={92}
        />
      </motion.div>
    </motion.div>
  );
}

function TradingCardStrip({ animate, className }: { animate: boolean; className?: string }) {
  const cardW = "w-[7.25rem] shrink-0 sm:w-[7.75rem] lg:min-w-0 lg:w-auto lg:flex-1";
  return (
    <div className={className ?? "mt-10 w-full pb-1 sm:mt-12 lg:mt-14"}>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-5 gap-y-5 px-4 sm:gap-x-7 sm:gap-y-6 sm:px-6 lg:flex-nowrap lg:justify-center lg:gap-x-6 lg:gap-y-0 lg:px-6">
        {trackedCards.map((card, i) => (
          <motion.div
            key={card.alt}
            className={cardW}
            initial={animate ? { opacity: 0, y: 16 } : false}
            whileInView={animate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: "-32px" }}
            transition={{ duration: 0.42, delay: i * 0.055, ease: easeOut }}
          >
            <div className="overflow-hidden rounded-xl border border-[color:color-mix(in_oklab,var(--border-warm)_75%,transparent)] bg-[var(--surface-raised)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.12)]">
              <Image
                src={card.src}
                alt={card.alt}
                width={280}
                height={400}
                className="aspect-[7/10] h-auto w-full object-cover"
                sizes="(max-width: 1023px) 140px, 12vw"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const lineTransition = { duration: 0.44, ease: easeOut };

export default function Home() {
  const reduce = useReducedMotion();
  const motionOn = !reduce;
  const { user } = useAuth();
  const router = useRouter();
  const heroRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const contentPad = "pt-[8.75rem] sm:pt-[9.25rem] lg:pt-[9.5rem]";

  if (user) {
    return <div className="min-h-dvh bg-[var(--background)]" aria-busy="true" />;
  }

  return (
    <main className="landing-page min-h-dvh bg-[var(--background)] font-sans leading-[1.6]">
      <section
        ref={heroRef}
        className="landing-hero-surface relative z-[1] overflow-x-hidden border-b border-[color:color-mix(in_oklab,var(--border-warm)_65%,transparent)]"
      >
        <motion.header
          className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between gap-2.5 border-b border-[color:color-mix(in_oklab,var(--border-warm)_70%,transparent)] bg-[color:color-mix(in_oklab,var(--surface-raised)_92%,var(--background))]/95 px-3.5 pb-3 pt-4 backdrop-blur-md max-[380px]:gap-2 max-[380px]:px-3 sm:left-0 sm:right-0 sm:gap-4 sm:px-6 sm:pb-3.5 sm:pt-5 lg:px-10"
          initial={motionOn ? { opacity: 0, y: -10 } : false}
          animate={motionOn ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.48, ease: easeOut }}
        >
          <motion.div
            className="group flex min-w-0 flex-1 items-center gap-1.5 max-[380px]:gap-1 sm:gap-2"
            initial={motionOn ? { scale: 0.94, opacity: 0 } : false}
            animate={motionOn ? { scale: 1, opacity: 1 } : undefined}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <Image
              src="/collectionops-brand-logo.png"
              alt=""
              width={1024}
              height={1024}
              className="h-[3.25rem] w-auto max-h-[3.25rem] shrink-0 object-contain object-left transition-transform duration-200 ease-out group-hover:scale-[1.02] max-[380px]:h-[3rem] max-[380px]:max-h-[3rem] sm:h-[3.8rem] sm:max-h-[3.8rem]"
              priority
              sizes="(max-width: 640px) 152px, 180px"
              aria-hidden
            />
            <span className="truncate pr-1 font-sans text-[1.2rem] font-semibold leading-none tracking-[-0.02em] text-[color:var(--landing-fg)] max-[380px]:text-[1.1rem] sm:text-[1.45rem]">
              CollectionOps
            </span>
          </motion.div>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Landing actions">
            <Link
              href="/login"
              className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] border border-[color:color-mix(in_oklab,var(--border-warm),transparent)] bg-transparent px-[0.95rem] text-sm font-medium text-[color:var(--landing-fg)] transition-[transform,background-color,color] duration-200 ease-out hover:bg-[var(--surface-muted)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] max-[380px]:h-[2.375rem] max-[380px]:px-3.5 max-[380px]:text-[0.82rem] sm:h-11 sm:px-5 sm:text-[0.9375rem]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] bg-[color:var(--accent)] px-[1.05rem] text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-[color:var(--accent-hover)] hover:shadow-[0_6px_16px_-4px_rgba(26,155,127,0.35)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] max-[380px]:h-[2.375rem] max-[380px]:px-4 max-[380px]:text-[0.82rem] sm:h-11 sm:px-6 sm:text-[0.9375rem]"
            >
              Sign up
            </Link>
          </nav>
        </motion.header>

        <div className="relative z-[1] mx-auto grid w-full max-w-[min(100%,88rem)] grid-cols-1 gap-10 px-4 pb-4 sm:px-6 sm:pb-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:pb-8 xl:gap-14 xl:px-10">
            <motion.div
              className={`relative z-[1] flex min-w-0 flex-col items-center justify-center pb-10 text-center sm:pb-12 lg:items-start lg:justify-center lg:pb-20 lg:pr-4 lg:text-left xl:pr-6 ${contentPad}`}
              initial={motionOn ? { opacity: 0, y: 16 } : false}
              animate={motionOn ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, ease: easeOut }}
            >
              <span
                className="mb-5 block h-1 w-11 rounded-full bg-[color:color-mix(in_oklab,var(--accent)_55%,var(--warm-gold))] lg:hidden"
                aria-hidden
              />
              <div className="relative w-full max-w-xl lg:max-w-none lg:pl-5">
                <span
                  className="absolute left-0 top-[0.28em] hidden h-[clamp(2.75rem,8vw,3.75rem)] w-1 rounded-full bg-[color:color-mix(in_oklab,var(--accent)_55%,var(--warm-gold))] lg:block"
                  aria-hidden
                />
                <motion.h1
                  className="font-display w-full min-w-0 text-[clamp(2.75rem,5.5vw,4rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[color:var(--landing-fg)]"
                  initial={motionOn ? { opacity: 0, y: 18 } : false}
                  animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                  transition={{ ...lineTransition, delay: 0.04 }}
                >
                  Whether you have 10 listings or 10,000, you deserve to see what your store is actually doing.
                </motion.h1>
              </div>
              <motion.p
                className="landing-body-muted mt-8 w-full max-w-[34rem] text-[1.0625rem] leading-[1.6] sm:mt-10"
                initial={motionOn ? { opacity: 0, y: 12 } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                transition={{ ...lineTransition, delay: 0.1 }}
              >
                Upload your exports and see your real numbers clearly laid out. Orders, fees, shipping costs, trends
                over time. No spreadsheets, no guessing.
              </motion.p>
              <motion.div
                className="mt-10 flex w-full flex-col items-center gap-0 sm:mt-11 lg:items-start lg:mt-12"
                initial={motionOn ? { opacity: 0, y: 12 } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                transition={{ ...lineTransition, delay: 0.14 }}
              >
                <Link
                  href="/data?demo=1"
                  className="inline-flex w-auto shrink-0 items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-9 py-3.5 text-[0.9375rem] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_14px_-4px_rgba(26,155,127,0.35)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-[color:var(--accent-hover)] hover:shadow-[0_8px_24px_-6px_rgba(26,155,127,0.4)] hover:-translate-y-0.5 active:scale-[0.97] sm:px-10 sm:py-4 sm:text-base"
                >
                  Try Demo
                </Link>
                <p className="landing-body-muted mt-3 text-[0.8125rem] font-medium leading-snug">
                  No signup required
                </p>
              </motion.div>
            </motion.div>

            <motion.div
              className="relative flex w-full flex-col items-center justify-center pb-16 pt-2 sm:pb-20 lg:min-h-0 lg:items-center lg:pb-20 lg:pt-6"
              initial={motionOn ? { opacity: 0, y: 20 } : false}
              animate={motionOn ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.55, delay: 0.08, ease: easeOut }}
            >
              <div className="relative w-full max-w-[min(100%,28rem)] sm:max-w-xl lg:mx-auto lg:max-w-[min(100%,36rem)]">
                <div className="relative w-full rounded-2xl border border-[color:color-mix(in_oklab,var(--border-warm)_80%,transparent)] bg-[var(--surface-raised)] p-2 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_24px_48px_-24px_rgba(0,0,0,0.12)] ring-1 ring-[color:color-mix(in_oklab,var(--accent)_8%,transparent)]">
                  <div className="relative aspect-[4/3] w-full max-h-[min(88vw,420px)] overflow-hidden rounded-xl sm:aspect-[5/4] sm:max-h-[480px] lg:aspect-[16/11] lg:max-h-[min(52vh,500px)]">
                    <HeroVisual animate={motionOn} heroRef={heroRef} />
                  </div>
                </div>
              </div>
            </motion.div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-[var(--background)]"
        aria-labelledby="landing-value-prop-heading"
      >
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center lg:max-w-3xl">
            <motion.h2
              id="landing-value-prop-heading"
              className="font-display max-w-xl text-[2.25rem] font-bold leading-[1.15] tracking-[-0.02em] text-[color:var(--landing-fg)]"
              initial={motionOn ? { opacity: 0, y: 16 } : false}
              whileInView={motionOn ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.48, ease: easeOut }}
            >
              Know if your store is actually working.
            </motion.h2>
            <motion.p
              className="landing-body-muted mt-7 max-w-lg text-[1.0625rem] leading-[1.6] sm:mt-8"
              initial={motionOn ? { opacity: 0, y: 12 } : false}
              whileInView={motionOn ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.44, delay: 0.05, ease: easeOut }}
            >
              Not inventory advice. Not a pro tool. Just your real numbers, clearly laid out, so you know if all that
              buying and selling is actually paying off.
            </motion.p>
            <ul className="mx-auto mt-12 w-full max-w-md space-y-5 text-left sm:mt-14" role="list">
              {[
                "Your profit after TCGplayer fees, stamps, and supplies",
                "Whether your store is growing week by week",
                "If you are on track to reach the next seller level",
              ].map((line, i) => (
                <motion.li
                  key={line}
                  className="flex items-start gap-3.5"
                  initial={motionOn ? { opacity: 0, y: 10 } : false}
                  whileInView={motionOn ? { opacity: 1, y: 0 } : undefined}
                  viewport={{ once: true, margin: "-24px" }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: easeOut }}
                >
                  <span
                    className={`mt-1.5 inline-block size-1.5 shrink-0 rounded-full ${
                      i % 2 === 0 ? "bg-[color:var(--accent)]" : "bg-[color:var(--metric-neutral)]"
                    }`}
                    aria-hidden
                  />
                  <span className="text-[1.0625rem] leading-snug text-[color:var(--landing-fg)]">{line}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-[color:color-mix(in_oklab,var(--surface-muted)_92%,var(--background))]"
        aria-label="Benefits"
      >
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
          <LandingBenefits animate={motionOn} />
          <TradingCardStrip
            animate={motionOn}
            className="mt-12 w-full border-t border-[color:color-mix(in_oklab,var(--border-warm)_70%,transparent)] bg-[var(--background)]/40 pb-1 pt-12 sm:mt-14 sm:pt-14 lg:mt-16 lg:rounded-2xl lg:border lg:border-[color:color-mix(in_oklab,var(--border-warm)_55%,transparent)] lg:px-4 lg:pt-16"
          />
          <motion.p
            className="landing-body-muted mx-auto mt-8 max-w-2xl text-center text-[0.9375rem] leading-[1.6] sm:mt-10 sm:text-base"
            initial={motionOn ? { opacity: 0, y: 12 } : false}
            whileInView={motionOn ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: "-32px" }}
            transition={{ duration: 0.44, ease: easeOut }}
          >
            Built for individual sellers across Pokemon, MTG, Lorcana, One Piece, Star Wars Unlimited, and more. If you
            sell on TCGplayer, this is for you.
          </motion.p>
        </div>
      </section>

      <section className="relative z-[1] bg-[var(--background)]" aria-label="Questions and next step">
        <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-14 lg:px-12 lg:pb-24 lg:pt-16">
          <LandingFAQ animate={motionOn} />
          <div>
            <LandingFinalCTA animate={motionOn} />
          </div>
          <motion.section
            className="rounded-2xl border border-[color:color-mix(in_oklab,var(--border-warm)_65%,transparent)] bg-[color:color-mix(in_oklab,var(--warm-gold-soft)_28%,var(--surface-muted))] px-6 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:px-10 sm:py-14"
            aria-labelledby="landing-community-heading"
            initial={motionOn ? { opacity: 0, y: 14 } : false}
            whileInView={motionOn ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: "-28px" }}
            transition={{ duration: 0.44, ease: easeOut }}
          >
            <h2
              id="landing-community-heading"
              className="font-display text-[2.25rem] font-bold leading-tight tracking-[-0.02em] text-[color:var(--landing-fg)]"
            >
              Join the Community
            </h2>
            <p className="landing-body-muted mx-auto mt-5 max-w-md text-pretty text-[0.9375rem] leading-[1.6] sm:mt-6 sm:text-base">
              Connect with other TCG sellers. Share setups, celebrate wins, ask questions, and figure out this business
              together.
            </p>
            <div className="mt-9 sm:mt-10">
              <a
                href="https://discord.gg/ZJrehxKRH"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-8 text-[0.9375rem] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_14px_-4px_rgba(26,155,127,0.35)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-[color:var(--accent-hover)] hover:shadow-[0_8px_22px_-6px_rgba(26,155,127,0.4)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)] sm:h-12 sm:px-9 sm:text-base"
              >
                Join Our Discord
              </a>
            </div>
          </motion.section>
          <motion.footer
            className="mt-10 border-t border-[color:color-mix(in_oklab,var(--border-warm)_55%,transparent)] pt-8 sm:mt-12 sm:pt-10"
            initial={motionOn ? { opacity: 0 } : false}
            whileInView={motionOn ? { opacity: 1 } : undefined}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:gap-5 md:flex-row md:text-left">
              <p className="landing-body-muted text-xs font-medium tracking-tight sm:text-sm">
                © 2026 BrickThread. All rights reserved.
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium" aria-label="Footer links">
                <Link
                  href="/privacy"
                  className="landing-body-muted transition-colors duration-200 ease-out hover:text-[color:var(--landing-fg)]"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="landing-body-muted transition-colors duration-200 ease-out hover:text-[color:var(--landing-fg)]"
                >
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="landing-body-muted transition-colors duration-200 ease-out hover:text-[color:var(--landing-fg)]"
                >
                  Contact
                </Link>
              </nav>
            </div>
          </motion.footer>
        </div>
      </section>
      <FeedbackFloatingButton />
    </main>
  );
}
