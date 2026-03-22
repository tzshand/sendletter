import { Check, Mail } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 ring-1 ring-green-200">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Letter sent!</h1>
        <p className="text-gray-500 mb-8">
          Your letter is being printed and will be in the mail within 1 business
          day. Expect delivery in 3-5 business days.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Send another letter
        </Link>
      </div>
    </div>
  );
}
