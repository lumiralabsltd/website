"use client"

import { Globe } from "@/components/ui/cobe-globe"
import { Navbar } from "@/components/navbar"
import { About } from "@/components/about"
import { Team } from "@/components/team"
import { Products } from "@/components/products"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"
import { motion } from "motion/react"
// lib/motion used in section components

const markers = [
  { id: "nyc",    location: [40.7128,  -74.006 ] as [number, number], label: "New York"      },
  { id: "london", location: [51.5074,   -0.1278] as [number, number], label: "London"        },
  { id: "tokyo",  location: [35.6762,  139.6503] as [number, number], label: "Tokyo"         },
  { id: "sf",     location: [37.7595, -122.4367] as [number, number], label: "San Francisco" },
  { id: "dubai",  location: [25.2048,   55.2708] as [number, number], label: "Dubai"         },
  { id: "sydney", location: [-33.8688, 151.2093] as [number, number], label: "Sydney"        },
]

const arcs = [
  { id: "nyc-lon", from: [40.7128,  -74.006 ] as [number, number], to: [51.5074,  -0.1278] as [number, number] },
  { id: "sf-tok",  from: [37.7595, -122.4367] as [number, number], to: [35.6762, 139.6503] as [number, number] },
  { id: "lon-dxb", from: [51.5074,  -0.1278 ] as [number, number], to: [25.2048,  55.2708] as [number, number] },
]

function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white"
    >
      {/* Dot-matrix tech pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.55,
        }}
      />
      {/* Radial fade to white — masks edges of dots */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, white 100%)",
        }}
      />
      {/* Subtle colour bloom behind globe */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 65%, rgba(99,88,255,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-5xl">
        {/* Label */}
        <div className="hero-animate hero-animate-delay-1 mb-6">
          <span className="inline-flex items-center gap-2 text-zinc-400 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 inline-block" />
            Venture Studio
          </span>
        </div>

        {/* Wordmark */}
        <h1
          className="hero-animate hero-animate-delay-2 text-[clamp(3rem,9vw,7rem)] font-bold tracking-tight text-zinc-900 leading-none mb-4"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Lumira Labs
        </h1>

        {/* Tagline */}
        <p
          className="hero-animate hero-animate-delay-3 text-zinc-400 text-base sm:text-lg mb-14 max-w-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Building software that actually matters.
        </p>

        {/* Globe */}
        <div className="hero-animate hero-animate-delay-4 w-full max-w-[480px] sm:max-w-[540px] globe-ring">
          <Globe
            markers={markers} arcs={arcs}
            dark={0}
            baseColor={[0.97, 0.97, 0.97]}
            markerColor={[0.06, 0.06, 0.06]}
            arcColor={[0.4, 0.35, 0.9]}
            glowColor={[0.85, 0.85, 0.9]}
            mapBrightness={7} markerSize={0.036} speed={0.004} diffuse={1.6} theta={0.22}
          />
        </div>

        {/* Scroll cue */}
        <div className="hero-animate-fade hero-bounce mt-12">
          <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="divider" />
        <About />
        <div className="divider" />
        <Team />
        <div className="divider" />
        <Products />
        <div className="divider" />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
