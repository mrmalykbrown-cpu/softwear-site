import Link from "next/link";
import { Logo } from "@/components/brand/crosshair";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 py-12">
      <Link href="/" className="self-center" aria-label="OddScope home">
        <Logo />
      </Link>
      <div className="mt-10">{children}</div>
    </div>
  );
}
