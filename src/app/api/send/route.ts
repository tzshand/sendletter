import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { htmlContent, from, to } = body;

  // Validate required fields
  if (!htmlContent || !from || !to) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // TODO: Integrate with Stripe for payment
  // TODO: Integrate with a print-and-mail API (e.g., Lob, PostGrid, Click2Mail)
  // For now, just acknowledge receipt
  console.log("Letter submission received:", {
    from: from.name,
    to: to.name,
    contentLength: htmlContent.length,
  });

  return NextResponse.json({ success: true, message: "Letter queued for sending" });
}
