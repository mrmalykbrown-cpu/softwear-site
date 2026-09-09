import Link from "next/link";
import { Crosshair } from "@/components/brand/crosshair";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-24 text-center">
      <Crosshair className="size-12 text-navy-800" />
      <h1 className="mt-6 text-lg font-semibold text-slate-100">Nothing here</h1>
      <p className="mt-2 text-sm text-slate-400">
        That page doesn&apos;t exist, or it isn&apos;t yours to see.
      </p>
      <Link href="/dashboard" className="mt-6 min-h-12 py-3 text-sm text-blue-400 hover:text-blue-500">
        Back to your dashboard
      </Link>
    </main>
  );
}
