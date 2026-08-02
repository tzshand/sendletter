// Shared typography for blog posts.
//
// Deliberately small and opinionated: the posts are meant to be short and
// scannable, so there is no h4, no blockquote, and no image component. If a
// post needs one of those, the post is probably too long.

import Link from "next/link";

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-gray-600 mb-4">{children}</p>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  // The first paragraph carries the answer on its own, so a featured snippet
  // or an AI overview can lift it without the rest of the page.
  return <p className="text-base leading-relaxed text-gray-800 mb-5 font-medium">{children}</p>;
}

export function H2({ children }: { children: React.ReactNode }) {
  const id = String(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <h2 id={id} className="text-lg font-bold text-gray-900 mt-9 mb-3 scroll-mt-20">
      {children}
    </h2>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-1.5 text-[15px] leading-relaxed text-gray-600 mb-4">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal list-outside pl-5 space-y-1.5 text-[15px] leading-relaxed text-gray-600 mb-4">
      {children}
    </ol>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto my-5">
      <table className="w-full text-sm border-collapse min-w-[420px]">
        <thead>
          <tr className="text-left border-b border-gray-200">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 align-top">
              {row.map((cell, j) => (
                <td key={j} className={`py-2.5 pr-4 ${j === 0 ? "font-medium text-gray-900" : "text-gray-600"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** For the honest caveats. Visually distinct so it doesn't read as filler. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-amber pl-4 py-1 my-5">
      <p className="text-[15px] leading-relaxed text-gray-700">{children}</p>
    </div>
  );
}

export function Pre({ children }: { children: string }) {
  return (
    <pre className="bg-gray-950 text-gray-200 text-[13px] rounded-lg p-4 overflow-x-auto leading-relaxed my-4">
      {children}
    </pre>
  );
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand hover:underline underline-offset-2"
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="text-brand hover:underline underline-offset-2">
      {children}
    </Link>
  );
}

/**
 * The single call to action. One per post, at the bottom, by design — a post
 * that interrupts itself to sell is a post nobody finishes.
 */
export function CTA({ variant }: { variant: "home" | "api" }) {
  const isApi = variant === "api";
  return (
    <div className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-semibold text-gray-900 mb-1">
        {isApi ? "Send a letter from your code" : "Send a letter without leaving your desk"}
      </p>
      <p className="text-[13px] text-gray-500 mb-4">
        {isApi
          ? "One POST request, one physical letter, anywhere in Canada. No minimums and no monthly platform fee."
          : "Write or upload it, add the addresses, and we print and mail it via Canada Post. From $3.79, printing and tax included."}
      </p>
      <Link
        href={isApi ? "/docs" : "/"}
        className="inline-flex items-center gap-2 bg-brand text-white text-sm font-bold px-4 h-10 rounded-xl hover:bg-brand-dark transition-colors"
      >
        {isApi ? "Read the API reference" : "Send a letter"}
      </Link>
    </div>
  );
}
