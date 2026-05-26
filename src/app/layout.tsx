import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Daily",
  description: "Daily check-in tracker with durable storage and no login.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US">
      <body>{children}</body>
    </html>
  );
}
