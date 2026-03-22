import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { htmlContent, from, to, mode, letterData } = body;

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // TODO: Verify Stripe payment was completed (check session_id)
  // TODO: Integrate with print-and-mail API (Lob, PostGrid, Click2Mail)
  console.log("Letter submission received:", {
    mode,
    from: from.name,
    to: to.name,
    contentLength: mode === "simple" ? letterData?.body?.length : htmlContent?.length,
  });

  return NextResponse.json({ success: true });
}
