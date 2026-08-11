import type { Metadata } from "next";
import DownloadClient from "./DownloadClient";
import s from "./download.module.css";

export const metadata: Metadata = {
  title: "Download the App · nsuOne",
  description:
    "Install the nsuOne Android app on your phone, or add it to your iPhone home screen. Scan the QR code to get it on your device.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <div className={s.page}>
      <div className={s.shell}>
        <DownloadClient />
      </div>
    </div>
  );
}
