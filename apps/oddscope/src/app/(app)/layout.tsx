import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { RiskModal } from "@/components/risk-modal";
import { currentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
      {user.riskAcknowledgedAt ? null : <RiskModal />}
    </>
  );
}
