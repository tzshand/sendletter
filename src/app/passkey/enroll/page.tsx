"use client";

// Where Canner Auth's emails land — this is the app's callback_url.
//
// It must live on sendletter.app rather than on Canner: the whole point of the
// link is to bind a passkey, and a WebAuthn ceremony only runs on an origin
// under the app's RP ID. A page hosted on auth.canner.app is not under
// sendletter.app, so the browser would refuse the ceremony outright.
//
// Used for recovery (all passkeys lost) and for first-time verification of an
// address we did not already have. Recovery deliberately REPLACES every
// existing credential — a lost device that later resurfaces must not still
// work.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SnowGoose } from "@/components/SnowGoose";
import { Loader2, KeyRound, Check } from "lucide-react";
import { enrollPasskey, usePasskeysSupported, wasDismissed } from "@/lib/passkey";
import Link from "next/link";

type State = "idle" | "working" | "done" | "error" | "unsupported" | "no-token";

function EnrollInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  const token = params.get("canner_auth_token");

  const supported = usePasskeysSupported();
  // What to show: derived from the URL and the browser, until the user acts.
  const view: State = !token ? "no-token" : state === "idle" && !supported ? "unsupported" : state;

  async function run() {
    if (!token) return;
    setState("working");
    setError("");
    try {
      const cannerToken = await enrollPasskey(token);
      const res = await fetch("/api/passkey/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cannerToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not finish setting up your passkey");
      }
      setState("done");
      setTimeout(() => router.push("/profile"), 1200);
    } catch (err) {
      if (wasDismissed(err)) {
        setState("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-gray-100 rounded-lg p-2">
            <SnowGoose size={28} />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">sendletter</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
          {view === "done" ? (
            <>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/60 flex items-center justify-center mx-auto mb-4">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Passkey ready</h1>
              <p className="text-sm text-gray-500">Taking you to your dashboard…</p>
            </>
          ) : view === "no-token" ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Link expired</h1>
              <p className="text-sm text-gray-500 mb-4">
                This link is missing its token, or it has already been used. Request a
                new one from the sign-in page.
              </p>
              <Link href="/login" className="text-sm font-semibold text-gray-900 hover:underline">
                Back to sign in
              </Link>
            </>
          ) : view === "unsupported" ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">
                This browser can&apos;t use passkeys
              </h1>
              <p className="text-sm text-gray-500">
                Open this link on a device with a fingerprint reader, face unlock, or a
                security key.
              </p>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-5 h-5 text-gray-600" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Set up your passkey</h1>
              <p className="text-sm text-gray-500 mb-5">
                Your device will ask you to confirm. This replaces any passkeys you had
                before, and becomes how you sign in.
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4 text-left">
                  {error}
                </p>
              )}

              <button
                onClick={run}
                disabled={state === "working"}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {state === "working" && <Loader2 size={16} className="animate-spin" />}
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PasskeyEnrollPage() {
  return (
    <Suspense fallback={null}>
      <EnrollInner />
    </Suspense>
  );
}
