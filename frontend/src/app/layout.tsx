import type { Metadata } from "next";
import "./globals.css";
import NextAuthSessionProvider from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Cavs Betting",
  description: "UpTop coding challenge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
      </body>
    </html>
  );
}
