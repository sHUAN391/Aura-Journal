import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Journal",
  description: "A CopilotKit-powered journal for onboarding, venting, reflection, and history.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
