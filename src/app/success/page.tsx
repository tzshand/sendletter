import { Check, Mail } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 bg-[#fafafa]">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-emerald-200/60">
          <Check className="w-6 h-6 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Letter sent!</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Your letter is being printed and will be in the mail within 1 business
          day. Expect delivery in 3–5 business days.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] transition-all"
        >
          <Mail className="w-4 h-4" />
          Send another letter
        </Link>
      </div>
    </div>
  );
}
