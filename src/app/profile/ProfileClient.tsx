"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { enrollPasskey, usePasskeysSupported, wasDismissed } from "@/lib/passkey";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { SnowGoose } from "@/components/SnowGoose";
import {
  Key,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Loader2,
  AlertTriangle,
  Trash2,
  KeyRound,
  Monitor,
} from "lucide-react";
import Link from "next/link";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type BillingAddress = {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

type Props = {
  account: {
    email: string;
    hasPaymentMethod: boolean;
    createdAt: string;
    hasPasskey: boolean;
    canRemovePasskey: boolean;
  };
  sessions: Array<{
    id: string;
    device: string;
    createdAt: string;
    lastSeenAt: string;
    current: boolean;
  }>;
  apiKey: { prefix: string; createdAt: string } | null;
  cardInfo: { brand: string; last4: string } | null;
  billingAddress: BillingAddress | null;
  usage: Array<{
    id: string;
    letter_mode: string;
    letter_size: string;
    amount_cents: number;
    billed: boolean;
    created_at: string;
  }>;
  billing: Array<{
    id: string;
    amount_cents: number;
    usage_count: number;
    status: string;
    created_at: string;
  }>;
};

function CardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Failed to save card");
      setLoading(false);
    } else {
      // Tell our backend the card was saved (don't wait for webhook)
      await fetch("/api/stripe/confirm-card", { method: "POST" });
      setLoading(false);
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        Save Card
      </button>
    </form>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Active now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-CA");
}

export function ProfileClient({
  account,
  apiKey,
  cardInfo,
  billingAddress,
  usage,
  billing,
  sessions: initialSessions,
}: Props) {
  const router = useRouter();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyPrefix, setKeyPrefix] = useState(apiKey?.prefix || null);
  const [copied, setCopied] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [hasPasskey, setHasPasskey] = useState(account.hasPasskey);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const canUsePasskeys = usePasskeysSupported();
  const [removeKeyConfirm, setRemoveKeyConfirm] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [sessionBusy, setSessionBusy] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");

  async function refreshSessions() {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setSessions((await res.json()).sessions);
    } catch {
      /* the list is already rendered from the server; leave it */
    }
  }

  async function endSession(id: string) {
    setSessionBusy(id);
    setSessionError("");
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not end that session");
      // Ending your own session is a sign-out; anything else just updates the list.
      if (data.ended_current) {
        router.push("/login");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Could not end that session");
    } finally {
      setSessionBusy(null);
    }
  }

  async function endOtherSessions() {
    setSessionBusy("others");
    setSessionError("");
    try {
      const res = await fetch("/api/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not end the other sessions");
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Could not end the other sessions");
    } finally {
      setSessionBusy(null);
    }
  }

  async function removePasskeys() {
    setPasskeyLoading(true);
    setPasskeyError("");
    try {
      const res = await fetch("/api/passkey", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove your passkeys");
      setHasPasskey(false);
      setRemoveKeyConfirm(false);
      // Removal also ends other sessions server-side — reflect that here rather
      // than leaving a stale list on screen.
      await refreshSessions();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Could not remove your passkeys");
    } finally {
      setPasskeyLoading(false);
    }
  }

  // Same inline enrollment the signup page runs — for anyone who dismissed the
  // prompt then, or who signed up before passkeys existed.
  async function addPasskey() {
    setPasskeyLoading(true);
    setPasskeyError("");
    try {
      const ticketRes = await fetch("/api/passkey/enroll-ticket", { method: "POST" });
      if (!ticketRes.ok) throw new Error("Could not start passkey setup");
      const { ticket } = await ticketRes.json();
      const token = await enrollPasskey(ticket);
      const res = await fetch("/api/passkey/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Could not finish passkey setup");
      setHasPasskey(true);
    } catch (err) {
      if (!wasDismissed(err)) {
        setPasskeyError(err instanceof Error ? err.message : "Passkey setup failed");
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  async function generateKey() {
    setKeyLoading(true);
    try {
      const res = await fetch("/api/api-keys", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        setKeyPrefix(data.prefix);
      }
    } finally {
      setKeyLoading(false);
    }
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function openCardForm() {
    setCardLoading(true);
    setRemoveConfirm(false);
    setRemoveError("");
    try {
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setClientSecret(data.clientSecret);
        setShowCardForm(true);
      }
    } finally {
      setCardLoading(false);
    }
  }

  async function handleRemoveCard() {
    setRemoveLoading(true);
    setRemoveError("");
    try {
      const res = await fetch("/api/stripe/remove-card", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        setRemoveError(data.error || "Failed to remove card");
      }
    } catch {
      setRemoveError("Something went wrong");
    } finally {
      setRemoveLoading(false);
      setRemoveConfirm(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-zinc-950 text-white px-5 h-[56px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
          <SnowGoose size={24} />
          <span className="text-[14px] font-bold tracking-tight text-gray-900">sendletter</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">{account.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">API Dashboard</h1>

        {/* Payment Method */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Payment Method</h2>
          </div>

          {showCardForm && clientSecret ? (
            <div>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CardForm onSuccess={() => { setShowCardForm(false); router.refresh(); }} />
              </Elements>
              <button
                onClick={() => setShowCardForm(false)}
                className="mt-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : cardInfo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono">
                    {cardInfo.brand.toUpperCase()} •••• {cardInfo.last4}
                  </div>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openCardForm}
                    disabled={cardLoading}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    {cardLoading ? <Loader2 size={14} className="animate-spin" /> : "Change"}
                  </button>
                  <button
                    onClick={() => setRemoveConfirm(true)}
                    className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {removeConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-800 mb-2">
                    Remove your payment method? This will deactivate your API key. Any outstanding balance will be charged first.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRemoveCard}
                      disabled={removeLoading}
                      className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {removeLoading && <Loader2 size={12} className="animate-spin" />}
                      Remove Card
                    </button>
                    <button
                      onClick={() => { setRemoveConfirm(false); setRemoveError(""); }}
                      className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {removeError && (
                    <p className="text-xs text-red-600 mt-2">{removeError}</p>
                  )}
                </div>
              )}
              {billingAddress && (
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Billing address</span>
                  <div className="mt-1">
                    {billingAddress.name && <div>{billingAddress.name}</div>}
                    {billingAddress.line1 && <div>{billingAddress.line1}</div>}
                    {billingAddress.line2 && <div>{billingAddress.line2}</div>}
                    <div>
                      {[billingAddress.city, billingAddress.state].filter(Boolean).join(", ")}
                      {billingAddress.postal_code ? `  ${billingAddress.postal_code}` : ""}
                    </div>
                    {billingAddress.country && billingAddress.country !== "CA" && (
                      <div>{billingAddress.country}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle size={14} />
                A payment method is required to use the API.
              </div>
              <button
                onClick={openCardForm}
                disabled={cardLoading}
                className="flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {cardLoading && <Loader2 size={16} className="animate-spin" />}
                Add Payment Method
              </button>
            </div>
          )}
        </section>

        {/* Sign-in */}
        {canUsePasskeys && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={18} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Sign-in</h2>
            </div>

            {passkeyError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                {passkeyError}
              </p>
            )}

            {hasPasskey ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-200/60 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">Passkey active</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    You sign in with your device. Your password alone will no longer
                    get you in — it now asks for the passkey too.
                  </p>

                  {!account.canRemovePasskey ? (
                    <p className="text-xs text-gray-400 mt-3">
                      This passkey is the only way into your account, so it can&apos;t be
                      removed. Set a password first if you want to remove it.
                    </p>
                  ) : removeKeyConfirm ? (
                    <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-xs text-red-700 mb-2.5">
                        This removes <strong>every</strong> passkey on the account, on all
                        your devices — Canner doesn&apos;t support removing just one. Other
                        devices will also be signed out. You&apos;ll sign in with your
                        password afterwards.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={removePasskeys}
                          disabled={passkeyLoading}
                          className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {passkeyLoading && <Loader2 size={12} className="animate-spin" />}
                          Remove all passkeys
                        </button>
                        <button
                          onClick={() => setRemoveKeyConfirm(false)}
                          disabled={passkeyLoading}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemoveKeyConfirm(true)}
                      className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors mt-3"
                    >
                      Remove passkey
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">Add a passkey</p>
                  <p className="text-xs text-gray-500 mt-0.5 mb-3">
                    Sign in with your fingerprint, face, or security key instead of
                    typing a password.
                  </p>
                  <button
                    onClick={addPasskey}
                    disabled={passkeyLoading}
                    className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {passkeyLoading && <Loader2 size={14} className="animate-spin" />}
                    Set up passkey
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Active sessions */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Where you&apos;re signed in</h2>
            </div>
            {sessions.filter((s) => !s.current).length > 0 && (
              <button
                onClick={endOtherSessions}
                disabled={sessionBusy !== null}
                className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                {sessionBusy === "others" ? "Ending…" : "End all others"}
              </button>
            )}
          </div>

          {sessionError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{sessionError}</p>
          )}

          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400">No recorded sessions.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      {s.device}
                      {s.current && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/60 rounded px-1.5 py-0.5">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {relativeTime(s.lastSeenAt)} · signed in{" "}
                      {new Date(s.createdAt).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <button
                    onClick={() => endSession(s.id)}
                    disabled={sessionBusy !== null}
                    className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {sessionBusy === s.id ? "…" : s.current ? "Sign out" : "End"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-3">
            We record the browser and a one-way hash of the IP address — enough to tell
            your sessions apart, not enough to track where you are.
          </p>
        </section>

        {/* API Key */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">API Key</h2>
          </div>

          {newKey ? (
            <div className="space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Copy your API key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono break-all">
                  {newKey}
                </code>
                <button
                  onClick={copyKey}
                  className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-400" />}
                </button>
              </div>
            </div>
          ) : keyPrefix ? (
            <div className="flex items-center justify-between">
              <code className="bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono">{keyPrefix}</code>
              <button
                onClick={generateKey}
                disabled={keyLoading}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            </div>
          ) : (
            <button
              onClick={generateKey}
              disabled={keyLoading}
              className="flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {keyLoading && <Loader2 size={16} className="animate-spin" />}
              Generate API Key
            </button>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              Use your API key in the <code className="bg-gray-100 px-1 rounded">Authorization</code> header:
            </p>
            <pre className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 overflow-x-auto">
              {`curl -X POST https://sendletter.app/api/v1/send \\
  -H "Authorization: Bearer sl_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"mode":"draft","letter":{"body":"Hello"},...}'`}
            </pre>
            <Link
              href="/docs"
              className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Full API Reference &rarr;
            </Link>
            <Link
              href="/account/developers"
              className="inline-block mt-2 ml-4 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Test keys, webhooks &amp; spending limits &rarr;
            </Link>
            <Link
              href="/account/orders"
              className="inline-block mt-2 ml-4 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Orders &amp; invoices &rarr;
            </Link>
          </div>
        </section>

        {/* Usage */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Usage</h2>
          {usage.length === 0 ? (
            <p className="text-sm text-gray-400">No API letters sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Mode</th>
                    <th className="pb-2 font-medium">Size</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Billed</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600">
                        {new Date(u.created_at).toLocaleDateString("en-CA")}
                      </td>
                      <td className="py-2 text-gray-600">{u.letter_mode}</td>
                      <td className="py-2 text-gray-600">{u.letter_size}</td>
                      <td className="py-2 text-right text-gray-900 font-medium">
                        ${(u.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`text-xs font-medium ${u.billed ? "text-green-600" : "text-amber-600"}`}>
                          {u.billed ? "Yes" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Billing History */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing History</h2>
          {billing.length === 0 ? (
            <p className="text-sm text-gray-400">No charges yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Letters</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600">
                        {new Date(b.created_at).toLocaleDateString("en-CA")}
                      </td>
                      <td className="py-2 text-gray-600">{b.usage_count}</td>
                      <td className="py-2 text-right text-gray-900 font-medium">
                        ${(b.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`text-xs font-medium ${
                            b.status === "succeeded"
                              ? "text-green-600"
                              : b.status === "failed"
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
