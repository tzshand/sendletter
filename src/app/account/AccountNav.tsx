"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account/developers", label: "Developers" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/invoices", label: "Invoices" },
  { href: "/profile", label: "Profile & billing" },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-8 print:hidden" aria-label="Account">
      {TABS.map((t) => {
        const active = path === t.href || (t.href !== "/profile" && path.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors ${
              active ? "border-brand text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
