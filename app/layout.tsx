import type { Metadata } from "next";
import { Space_Mono, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";


const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OpenDeck - flashcards, shared",
  description: "No Login Required to Borrow Someone Else's Study Notes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem("theme");
                if (stored === "dark") {
                  document.documentElement.classList.add("dark");
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${spaceMono.variable} ${inter.variable} font-body`}>
        <AuthProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto px-6 pb-24 md:pb-24">{children}</main>
          <MobileTabBar />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}