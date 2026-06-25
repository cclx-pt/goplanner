import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Go Planner",
  description: "Organize today. Impact tomorrow. — plataforma modular de gestão de igreja",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
