import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

export type OrderInsert = {
  stripe_session_id: string | null;
  stripe_payment_status: string;
  customer_email: string;
  letter_mode: string;
  letter_size: string;
  page_count: number;
  amount_cents: number;
  from_name: string;
  from_line1: string;
  from_line2?: string | null;
  from_city: string;
  from_province: string;
  from_postal: string;
  from_country?: string | null;
  to_name: string;
  to_line1: string;
  to_line2?: string | null;
  to_city: string;
  to_province: string;
  to_postal: string;
  to_country?: string | null;
  has_pdf_attachment: boolean;
  letter_html?: string | null;
  api_account_id?: string | null;
  api_usage_id?: string | null;
};
