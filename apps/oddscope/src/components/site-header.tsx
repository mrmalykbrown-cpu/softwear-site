"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/crosshair";
import { ButtonLink } from "@/components/ui/button";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-it-works", label: "Why it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" aria-label="OddScope home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-slate-100">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-slate-400 hover:text-slate-100">
            Log in
          </Link>
          <ButtonLink href="/signup" size="sm">
            Start free trial
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-lg border border-navy-800 text-slate-100 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-navy-800 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center text-slate-100"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center text-slate-100"
            >
              Log in
            </Link>
          </nav>
          <ButtonLink href="/signup" size="lg" className="mt-3 w-full">
            Start free trial
          </ButtonLink>
        </div>
      ) : null}
    </header>
  );
}
