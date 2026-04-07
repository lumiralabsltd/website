import type { Variants } from "motion/react"

// Scroll-triggered: content visible by default, animates up into final position
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0  },
}

export const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
}

export const transition = { duration: 0.55, ease: "easeOut" as const }
export const viewport = { once: true, amount: 0.15 } as const
