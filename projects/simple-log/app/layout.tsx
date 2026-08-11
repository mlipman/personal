import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "simple_log",
  description: "Capture a thought, attach an image, and talk with your logs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
