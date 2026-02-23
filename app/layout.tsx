import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Beri — Haberdashers' Boys' School AI Assistant",
  description:
    "Ask Beri anything about Haberdashers' Boys' School — admissions, fees, curriculum, sport, and school life.",
  icons: {
    icon: `${basePath}/favicon.png`,
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
        <link rel="icon" href={`${basePath}/favicon.png`} type="image/png" />
      </head>
      <body style={{ background: "#0B1A3B", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
