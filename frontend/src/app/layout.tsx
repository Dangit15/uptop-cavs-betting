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
      <body className="bg-white text-black antialiased">
        <div className="min-h-screen bg-white">
          <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
        </div>
      </body>
    </html>
  );
}
