import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beri — Haberdashers' Boys' School AI Assistant",
  description:
    "Ask Beri anything about Haberdashers' Boys' School — admissions, fees, curriculum, sport, and school life.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0B1A3B" />
      </head>
      <body style={{ background: "#0B1A3B", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
