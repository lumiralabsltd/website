export function Footer() {
  return (
    <footer className="border-t border-zinc-100 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-semibold text-zinc-900 text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Lumira Labs
        </span>
        <p className="text-zinc-400 text-sm">© {new Date().getFullYear()} Lumira Labs. All rights reserved.</p>
        <a href="mailto:sukhandnick@gmail.com"
          className="text-zinc-400 hover:text-zinc-700 text-sm transition-colors cursor-pointer">
          sukhandnick@gmail.com
        </a>
      </div>
    </footer>
  )
}
