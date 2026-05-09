import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRCodeImage({
  value,
  size = 192,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} width={size} height={size} className={className} aria-label="QR code" />;
}
