import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { CustomerProvider } from "@/components/customer-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user}>
      <CustomerProvider>{children}</CustomerProvider>
    </AppShell>
  );
}
