import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "sendletter — Mail a letter online from $3.79";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#F0513C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 7l10 7 10-7" />
            </svg>
          </div>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#171717" }}>
            sendletter
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#171717",
            marginBottom: 16,
          }}
        >
          Send Mail Online
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: "#737373",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Write or upload your letter, add addresses, and we print and mail it
          anywhere in Canada. From $3.79 CAD.
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: 32,
            fontSize: 18,
            color: "#a3a3a3",
          }}
        >
          <span>No account needed</span>
          <span>·</span>
          <span>No subscription</span>
          <span>·</span>
          <span>No minimum</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
