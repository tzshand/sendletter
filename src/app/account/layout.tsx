import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SnowGoose } from "@/components/SnowGoose";
import { AccountNav } from "./AccountNav";

// Everything under /account needs a signed-in account. The middleware is only a
// pre-filter; this is the check that counts (it also honours revoked sessions).
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between print:hidden">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <Link href="/docs" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">API docs</Link>
      </header>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <AccountNav />
        {children}
      </div>
    </div>
  );
}
