import Link from "next/link";
import { Logo } from "@/components/brand/crosshair";

/**
 * The footer carries the risk disclaimer, and the root layout renders the
 * footer on every route — so the disclaimer is present on every page by
 * construction rather than by remembering to add it.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-navy-800">
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <Link href="/terms" className="hover:text-slate-100">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-100">
              Privacy
            </Link>
            <Link href="/responsible-gambling" className="hover:text-slate-100">
              Responsible Gambling
            </Link>
            <Link href="/contact" className="hover:text-slate-100">
              Contact
            </Link>
          </nav>
        </div>

        <p className="prose-measure mt-8 text-xs leading-relaxed text-slate-400">
          18+. Betting carries a risk of financial loss. OddScope provides statistical
          analysis, not guaranteed outcomes. Never stake money you cannot afford to lose.
        </p>
      </div>
    </footer>
  );
}
