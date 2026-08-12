"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SnowGoose } from "@/components/SnowGoose";
import { Loader2, KeyRound } from "lucide-react";
import { authenticatePasskey, passkeysSupported, wasDismissed } from "@/lib/passkey";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_failed: "Google sign-in failed. Please try again.",
  google_no_email: "Could not get your email from Google.",
  account_failed: "Account creation failed. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [canUsePasskeys, setCanUsePasskeys] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Feature-detected on the client only — rendering the passkey button during
  // SSR would flash it for browsers that cannot use it.
  useEffect(() => setCanUsePasskeys(passkeysSupported()), []);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError && GOOGLE_ERROR_MESSAGES[oauthError]) {
      setError(GOOGLE_ERROR_MESSAGES[oauthError]);
    }
  }, [searchParams]);

  /** Exchange a Canner passkey token for a sendletter session. */
  async function finishWithPasskey(token: string, pendingToken?: string) {
    const res = await fetch("/api/passkey/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingToken ? { token, pending_token: pendingToken } : { token }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Passkey sign-in failed");
    }
    router.push("/profile");
  }

  /**
   * Lost-passkey recovery. Canner emails a link back to /passkey/enroll; the
   * email's language comes from the setting the user picked on the send form,
   * which is the only signal we have about what they actually read. Falls back
   * to the auth app's default_locale if we send nothing recognisable.
   */
  async function startRecovery() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email address first, then try again.");
      return;
    }
    let locale = "en";
    try {
      const saved = localStorage.getItem("sl-settings");
      if (saved) locale = JSON.parse(saved).language || "en";
    } catch {
      /* default to English */
    }
    try {
      await fetch("/api/passkey/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
    } catch {
      /* the response is uniform by design — say the same thing either way */
    }
    setRecoverySent(true);
  }

  /** Passkey-first: no email, no password — the browser picks the account. */
  async function handlePasskey() {
    setError("");
    setPasskeyLoading(true);
    try {
      const token = await authenticatePasskey();
      await finishWithPasskey(token);
    } catch (err) {
      if (!wasDismissed(err)) {
        setError(err instanceof Error ? err.message : "Passkey sign-in failed");
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // The password was right, but this account holds a passkey — so it is not
      // a sign-in on its own. No session exists yet; the ceremony below is what
      // completes it.
      if (data.passkey_required) {
        setPasskeyLoading(true);
        try {
          const token = await authenticatePasskey();
          await finishWithPasskey(token, data.pending_token);
        } catch (err) {
          setError(
            wasDismissed(err)
              ? "Sign-in needs your passkey. Try again when you're ready."
              : err instanceof Error ? err.message : "Passkey sign-in failed",
          );
        } finally {
          setPasskeyLoading(false);
        }
        return;
      }

      router.push("/profile");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
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

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Log In</h1>
          <p className="text-sm text-gray-500 mb-6">
            Access your API dashboard.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          {canUsePasskeys && (
            <>
              <button
                type="button"
                onClick={handlePasskey}
                disabled={passkeyLoading || loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {passkeyLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                Sign in with a passkey
              </button>

              <button
                type="button"
                onClick={startRecovery}
                disabled={recoverySent || passkeyLoading}
                className="w-full text-center text-xs font-medium text-gray-400 hover:text-gray-600 disabled:hover:text-gray-400 transition-colors mt-2.5"
              >
                {recoverySent ? "Check your email for a link" : "Lost your passkey?"}
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">or use your password</span>
                </div>
              </div>
            </>
          )}

          {/* Google OAuth — hidden until we have production credentials
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2.5 border border-gray-300 bg-white text-sm font-medium text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>
          */}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Log In
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Need an account?{" "}
            <a href="/signup" className="text-gray-900 font-medium hover:underline">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
