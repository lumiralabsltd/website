"use client"

import { motion } from "motion/react"
import { fadeUp, transition, viewport } from "@/lib/motion"

export function Contact() {
  return (
    <section id="contact" className="py-28 lg:py-36 max-w-6xl mx-auto px-6">
      <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition} className="mb-14">
        <span className="section-label">Contact</span>
      </motion.div>

      <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition} className="max-w-xl">
        <h2 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-zinc-900 mb-6"
          style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Let&apos;s build something extraordinary.
        </h2>
        <p className="text-zinc-500 text-lg leading-relaxed mb-10">
          Whether you want to partner, invest, or just chat — reach out.
        </p>

        <a href="mailto:hello@lumiralabs.co.uk" className="inline-flex items-center gap-3 group cursor-pointer">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700 transition-colors duration-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <span className="font-semibold text-zinc-900 group-hover:text-zinc-500 transition-colors duration-200"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            hello@lumiralabs.co.uk
          </span>
          <svg className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform duration-200"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </motion.div>
    </section>
  )
}
