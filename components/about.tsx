"use client"

import { motion } from "motion/react"
import { fadeUp, stagger, transition, viewport } from "@/lib/motion"

const pillars = [
  { title: "Enterprise-Grade Quality", body: "We build to the same standards that power global financial infrastructure — reliable, secure, performant." },
  { title: "Ship Fast, Stay Sharp",    body: "Startups move fast. We move faster — without cutting corners. Rapid iteration backed by solid architecture." },
  { title: "Built for Everyone",       body: "Our products are for the public — designed to be intuitive, accessible, and genuinely useful in daily life." },
]

export function About() {
  return (
    <section id="about" className="py-28 lg:py-36 max-w-6xl mx-auto px-6">
      <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition} className="mb-14">
        <span className="section-label">About</span>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-16 items-start">
        <motion.div initial="hidden" whileInView="show" viewport={viewport} variants={fadeUp} transition={transition}>
          <h2 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-zinc-900 mb-6"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Built by engineers.<br />Designed for everyone.
          </h2>
          <p className="text-zinc-500 text-lg leading-relaxed mb-4">
            Lumira Labs is a product studio founded by two JP Morgan Degree Apprentices. We design, build, and ship real software — apps, tools, and platforms that solve real problems for real people.
          </p>
          <p className="text-zinc-500 text-lg leading-relaxed mb-4">
            We know what it takes to build systems that scale, perform under pressure, and earn user trust.
          </p>
          <p className="text-zinc-500 text-lg leading-relaxed">
            Now we&apos;re applying that discipline to build products for everyone — not just institutions. Accessible, powerful software that the public deserves.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={viewport} className="space-y-4">
          {pillars.map((p) => (
            <motion.div key={p.title} variants={fadeUp} transition={transition} className="card p-6 cursor-default">
              <h3 className="font-semibold text-zinc-900 mb-2" style={{ fontFamily: "var(--font-space-grotesk)" }}>{p.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
