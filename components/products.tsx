"use client"

import { motion } from "motion/react"
import { fadeUp, stagger, transition, viewport } from "@/lib/motion"

export function Products() {
  return (
    <section id="products" className="py-28 lg:py-36 bg-zinc-50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition} className="mb-14">
          <span className="section-label">Products</span>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition} className="mb-10">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            In the pipeline.
          </h2>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={viewport} className="grid sm:grid-cols-2 gap-6">
          <motion.div variants={fadeUp} transition={transition} className="card p-8 cursor-default">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center mb-6">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-xl text-zinc-900" style={{ fontFamily: "var(--font-space-grotesk)" }}>Project Atlas</h3>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-zinc-900 text-white rounded-full"
                style={{ fontFamily: "var(--font-space-grotesk)" }}>Stealth</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Something big is coming. We can&apos;t say much yet — but if you&apos;re on our list, you&apos;ll hear first.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} transition={transition}
            className="card p-8 border-dashed flex flex-col items-center justify-center text-center min-h-[220px] cursor-default">
            <div className="w-10 h-10 rounded-xl border border-dashed border-zinc-300 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>More coming soon</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
