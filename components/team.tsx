"use client"

import { motion } from "motion/react"
import { fadeUp, stagger, transition, viewport } from "@/lib/motion"

const founders = [
  {
    name: "Sukhpinder Ubhi",
    role: "Co-Founder",
    initials: "SU",
    bio: "Software engineer and degree apprentice at JP Morgan Chase, specialising in full-stack development and financial systems. Sukh leads product and engineering at Lumira Labs — obsessed with building software that is both technically rigorous and genuinely useful.",
  },
  {
    name: "Nikolaos Efthymiopoulos",
    role: "Co-Founder",
    initials: "NE",
    bio: "Software engineer and degree apprentice at JP Morgan Chase, with a focus on systems design and scalable architecture. Nick leads infrastructure and platform at Lumira Labs — driven by the belief that enterprise-grade quality should be accessible to everyone.",
  },
]

export function Team() {
  return (
    <section id="team" className="py-28 lg:py-36 max-w-6xl mx-auto px-6">
      <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition} className="mb-14">
        <span className="section-label">Founders</span>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={viewport} className="grid md:grid-cols-2 gap-6">
        {founders.map((f) => (
          <motion.div key={f.name} variants={fadeUp} transition={transition} className="card p-8 cursor-default">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold tracking-wider" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                  {f.initials}
                </span>
              </div>
              <div>
                <p className="font-bold text-zinc-900 text-lg leading-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>{f.name}</p>
                <p className="text-zinc-400 text-sm mt-0.5">{f.role}</p>
              </div>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">{f.bio}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
