"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

import { useAuth } from "@/components/AuthProvider";
import LandingBenefits from "@/components/landing/LandingBenefits";
import LandingEmailCapture from "@/components/landing/LandingEmailCapture";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";

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

const easeOut = [0.22, 1, 0.36, 1] as const;

/** Full-bleed hero panel: fills parent, cover + right bias, no card radius. */
function HeroVisual({ animate }: { animate: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 h-full w-full min-h-[min(52vw,22rem)] overflow-hidden lg:min-h-0"
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay: 0.1, ease: easeOut }}
    >
      <Image
        src="/landing-hero-dashboard.png"
        alt="Seller using CollectionOps on a tablet — dashboard with profit, fees, and insights"
        fill
        className="h-full w-full object-cover object-[56%_35%] lg:object-right"
        sizes="(max-width: 1023px) 100vw, 50vw"
        priority
        quality={92}
      />
    </motion.div>
  );
}

function TradingCardStrip({ animate, className }: { animate: boolean; className?: string }) {
  const cardW = "w-[7.25rem] shrink-0 sm:w-[7.75rem] lg:min-w-0 lg:w-auto lg:flex-1";
  return (
    <div className={className ?? "mt-10 w-full pb-1 sm:mt-12 lg:mt-14"}>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-4 gap-y-3.5 px-4 sm:gap-x-5 sm:px-6 lg:flex-nowrap lg:justify-center lg:gap-x-3 lg:gap-y-0 lg:px-4">
        {trackedCards.map((card, i) => (
          <motion.div
            key={card.alt}
            className={cardW}
            initial={animate ? { opacity: 0, y: 20 } : false}
            whileInView={animate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: "-32px" }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: easeOut }}
          >
            <div className="overflow-hidden rounded-xl border border-white/90 bg-white shadow-[0_14px_32px_-8px_rgba(0,0,0,0.42)] ring-1 ring-slate-900/[0.06] transition duration-200 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] dark:border-slate-400/55 dark:bg-slate-800 dark:ring-white/10">
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

const lineTransition = { duration: 0.42, ease: easeOut };

export default function Home() {
  const reduce = useReducedMotion();
  const motionOn = !reduce;
  const { user } = useAuth();
  const router = useRouter();

  useLayoutEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const contentPad = "pt-[8.5rem] sm:pt-[9rem] lg:pt-[9.25rem]";

  if (user) {
    return <div className="min-h-dvh bg-slate-950" aria-busy="true" />;
  }

  return (
    <main className="min-h-dvh bg-slate-950">
      <section className="landing-hero-surface relative z-[1] overflow-x-clip text-slate-50">
        <motion.header
          className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between gap-2.5 px-3.5 pb-2 pt-4 max-[380px]:gap-2 max-[380px]:px-3 sm:left-0 sm:right-0 sm:gap-4 sm:px-6 sm:pb-2 sm:pt-5 lg:px-8"
          initial={motionOn ? { opacity: 0, y: -12 } : false}
          animate={motionOn ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.5, ease: easeOut }}
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
            <span className="truncate pr-1 text-[1.34rem] font-extrabold leading-none tracking-[-0.02em] text-white max-[380px]:text-[1.2rem] sm:text-[1.78rem]">
              CollectionOps
            </span>
          </motion.div>
          <nav className="flex shrink-0 items-center" aria-label="Landing actions">
            <Link
              href="/login"
              className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white px-[1.05rem] text-sm font-semibold text-slate-900 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.55)] ring-1 ring-white/25 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_14px_26px_-14px_rgba(15,23,42,0.62)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:translate-y-0 max-[380px]:h-[2.375rem] max-[380px]:px-4 max-[380px]:text-[0.82rem] sm:h-11 sm:px-6 sm:text-[0.94rem]"
            >
              Log in
            </Link>
          </nav>
        </motion.header>

        <div className="relative z-[1] mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-0 lg:min-h-[min(90svh,56rem)]">
            <motion.div
              className={`flex min-w-0 flex-col items-start justify-center px-4 pb-12 text-left sm:px-6 sm:pb-14 lg:min-h-0 lg:justify-center lg:px-8 lg:pb-20 lg:pr-10 xl:pl-12 xl:pr-12 ${contentPad}`}
              initial={motionOn ? { opacity: 0 } : false}
              animate={motionOn ? { opacity: 1 } : undefined}
              transition={{ duration: 0.35 }}
            >
              <motion.h1
                className="text-[1.8rem] font-extrabold leading-[1.18] tracking-tight text-white sm:text-4xl sm:leading-[1.15] lg:text-[2.35rem] lg:leading-[1.12]"
                initial={motionOn ? { opacity: 0, y: 12 } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                transition={{ ...lineTransition, delay: 0.02 }}
              >
                Spend less time tracking your store.
                <br />
                Spend more time enjoying it.
              </motion.h1>
              <motion.p
                className="mt-7 max-w-[34rem] text-[0.92rem] leading-[1.65] text-slate-200/95 sm:mt-8 sm:text-[0.975rem] sm:leading-[1.62]"
                initial={motionOn ? { opacity: 0, y: 8 } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                transition={{ ...lineTransition, delay: 0.08 }}
              >
                CollectionOps turns your TCGplayer exports into clear, trackable progress so you can skip the tedious
                sorting, calculating, and figuring it out.
              </motion.p>
              <motion.div
                className="mt-9 w-full max-w-2xl sm:mt-10 lg:mt-12"
                initial={motionOn ? { opacity: 0, y: 8 } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : undefined}
                transition={{ ...lineTransition, delay: 0.11 }}
              >
                <LandingEmailCapture compact framed heroWideForm />
              </motion.div>
            </motion.div>

            <div className="relative min-h-[min(52vw,22rem)] w-full lg:min-h-0 lg:self-stretch lg:pr-0">
              <HeroVisual animate={motionOn} />
            </div>
        </div>
      </section>

      <section
        className="relative z-[1] border-t border-teal-900/15 bg-gradient-to-b from-teal-50/95 via-cyan-50/88 to-slate-100/95 text-slate-900"
        aria-label="Benefits"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <LandingBenefits animate={motionOn} tone="band" />
          <TradingCardStrip
            animate={motionOn}
            className="mt-16 w-full border-t border-teal-900/12 pb-1 pt-12 sm:mt-18 sm:pt-14 lg:mt-24 lg:pt-16"
          />
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm font-medium leading-relaxed text-slate-700/95 sm:mt-7 sm:text-[0.95rem]">
            Built for Pokémon, MTG, Lorcana, One Piece, Star Wars Unlimited, and more.
          </p>
        </div>
      </section>

      <section className="relative z-[1] bg-white text-slate-900" aria-label="Questions and next step">
        <div className="mx-auto max-w-7xl px-4 py-18 sm:px-6 sm:py-22 lg:px-10 lg:py-26">
          <LandingFAQ animate={motionOn} tone="light" />
          <div className="mt-16 sm:mt-20 lg:mt-24">
            <LandingFinalCTA animate={motionOn} tone="light" />
          </div>
          <footer className="mt-14 border-t border-slate-200/85 pt-7 text-slate-600 sm:mt-16 sm:pt-8">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:gap-5 md:flex-row md:text-left">
              <p className="text-xs font-medium tracking-tight text-slate-500 sm:text-sm">
                © 2026 BrickThread. All rights reserved.
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium" aria-label="Footer links">
                <Link href="/privacy" className="text-slate-500 transition-colors duration-200 hover:text-slate-700">
                  Privacy
                </Link>
                <Link href="/terms" className="text-slate-500 transition-colors duration-200 hover:text-slate-700">
                  Terms
                </Link>
                <Link href="/contact" className="text-slate-500 transition-colors duration-200 hover:text-slate-700">
                  Contact
                </Link>
              </nav>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
