import type { Metadata } from "next";
import { Smartphone } from "lucide-react";
import DownloadClient from "./DownloadClient";

export const metadata: Metadata = {
  title: "Download the App · nsuOne",
  description:
    "Install the nsuOne Android app on your phone, or add it to your iPhone home screen. Scan the QR code to get it on your device.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="card" style={{ padding: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, var(--primary, #7c3aed), var(--primary-2, #2563eb))",
              color: "#ffffff",
              boxShadow: "0 10px 30px rgba(124, 58, 237, 0.25)",
            }}
          >
            <Smartphone size={26} aria-hidden="true" />
          </span>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
              Get the nsuOne app
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>
              Faster, full-screen, and built for your phone.
            </p>
          </div>
        </div>

        <DownloadClient />
      </div>
    </div>
  );
}
