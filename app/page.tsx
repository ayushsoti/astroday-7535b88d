"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";

const HEADLINE = "Welcome!";
const SUPPORT =
  "Sit back and relax, while we are turning your idea into a live app.";

const charContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

const charItem = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Home() {
  return (
    <main className="mayson-starter relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <div className="relative z-10 flex max-w-xl flex-col items-center text-center">
        <Image
          src="/mayson-logo.png"
          alt="Mayson"
          width={100}
          height={28}
          priority
        />

        <motion.h1
          className="mt-5 font-sans text-4xl font-semibold tracking-tight text-mayson-fg sm:text-5xl sm:leading-[1.1]"
          variants={charContainer}
          initial="hidden"
          animate="visible"
          aria-label={HEADLINE}
        >
          {HEADLINE.split("").map((char, i) => (
            <motion.span
              key={`${char}-${i}`}
              variants={charItem}
              className="inline-block"
              style={char === " " ? { width: "0.3em" } : undefined}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h1>

        <p
          className="shimmer fw-500 mt-5 max-w-md text-base leading-7 text-mayson-muted shimmer-duration-2500 sm:text-lg sm:leading-8"
          style={{ "--shimmer-color": "#fff" } as CSSProperties}
        >
          {SUPPORT}
        </p>
      </div>
    </main>
  );
}
