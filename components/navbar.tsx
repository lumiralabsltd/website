"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

function Logo({ dark }: { dark?: boolean }) {
  return (
    <a href="#hero" className="flex items-center gap-2.5 cursor-pointer group">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill={dark ? "white" : "#0a0a0a"} />
        <circle cx="16" cy="16" r="2.5" fill={dark ? "#0a0a0a" : "white"} />
        <circle cx="9" cy="10" r="1.5" fill={dark ? "#0a0a0a" : "white"} opacity="0.7" />
        <circle cx="23" cy="10" r="1.5" fill={dark ? "#0a0a0a" : "white"} opacity="0.7" />
        <circle cx="9" cy="22" r="1.5" fill={dark ? "#0a0a0a" : "white"} opacity="0.45" />
        <circle cx="23" cy="22" r="1.5" fill={dark ? "#0a0a0a" : "white"} opacity="0.45" />
        <circle cx="16" cy="7" r="1.5" fill={dark ? "#0a0a0a" : "white"} opacity="0.9" />
        <circle cx="16" cy="25" r="1.5" fill={dark ? "#0a0a0a" : "white"} opacity="0.35" />
        <line x1="16" y1="16" x2="9" y2="10" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.8" opacity="0.35" />
        <line x1="16" y1="16" x2="23" y2="10" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.8" opacity="0.35" />
        <line x1="16" y1="16" x2="9" y2="22" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.8" opacity="0.2" />
        <line x1="16" y1="16" x2="23" y2="22" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.8" opacity="0.2" />
        <line x1="16" y1="16" x2="16" y2="7" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.8" opacity="0.5" />
        <line x1="16" y1="16" x2="16" y2="25" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.8" opacity="0.18" />
        <line x1="9" y1="10" x2="16" y2="7" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.5" opacity="0.18" />
        <line x1="23" y1="10" x2="16" y2="7" stroke={dark ? "#0a0a0a" : "white"} strokeWidth="0.5" opacity="0.18" />
      </svg>
      <span
        className={`font-bold text-[15px] tracking-tight transition-colors ${dark ? "text-white" : "text-[#0a0a0a]"}`}
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        Lumira Labs
      </span>
    </a>
  )
}

export function Navbar({ dark: initialDark = false }: { dark?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 20)
      // Switch nav style after hero section
      const hero = document.getElementById("hero")
      setPastHero(hero ? window.scrollY > hero.offsetHeight - 80 : false)
    }
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const isDark = initialDark && !pastHero
  const navClass = isDark
    ? scrolled ? "nav-dark-scrolled" : "nav-dark"
    : scrolled ? "nav-scrolled" : "bg-white"

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navClass}`}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo dark={isDark} />
        <div className="hidden md:flex items-center gap-8">
          {["About", "Team", "Products", "Contact"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className={`text-sm font-medium transition-colors cursor-pointer ${isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {l}
            </a>
          ))}
        </div>
        <a
          href="mailto:hello@lumiralabs.co.uk"
          className={`hidden md:block cursor-pointer px-4 py-2 rounded-lg text-sm ${isDark ? "btn-white" : "btn-black"}`}
        >
          Get in Touch
        </a>
        <button onClick={() => setOpen(v => !v)} className={`md:hidden p-2 cursor-pointer ${isDark ? "text-white" : "text-zinc-900"}`} aria-label="Menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-zinc-100 px-6 py-4 flex flex-col gap-2">
          {["About", "Team", "Products", "Contact"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)}
              className="text-sm text-zinc-600 py-2 border-b border-zinc-100 cursor-pointer">
              {l}
            </a>
          ))}
          <a href="mailto:hello@lumiralabs.co.uk" className="btn-black text-center cursor-pointer px-4 py-3 rounded-lg text-sm mt-1">
            Get in Touch
          </a>
        </div>
      )}
    </motion.nav>
  )
}
