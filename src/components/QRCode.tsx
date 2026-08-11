"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * Thin wrapper around qrcode.react's QRCodeSVG so callers don't depend on the
 * library directly. SVG output keeps it SSR-safe (no canvas) and crisp at any
 * size. Defaults match the card surface on the /download page.
 */
export default function QRCode({
  value,
  size = 176,
  bgColor = "#ffffff",
  fgColor = "#0f172a",
  level = "M",
  marginSize = 2,
}: {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: "L" | "M" | "Q" | "H";
  marginSize?: number;
}) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
      level={level}
      marginSize={marginSize}
    />
  );
}
