import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
// SPEC-M61 E-11 (decision 7.12) — mount the sonner Toaster: 23 components
// toast through sonner but NO renderer was ever mounted, so error feedback
// on the paths M61 hardens (upload, approve, expiry) was invisible. All new
// M61 feedback uses sonner; the radix toaster below stays until legacy
// call-sites migrate.
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fiberpro ERP — AI Agent Harness",
  description: "Modern web rebuild of the Fiberpro garment/textile ERP with an integrated AI agent that controls every module through natural-language prompts.",
  keywords: ["Fiberpro", "Garment ERP", "Textile ERP", "AI Agent", "Function Calling", "GLM-4.6", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
  authors: [{ name: "Fiberpro Rebuild Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Fiberpro ERP — AI Agent Harness",
    description: "Garment/textile ERP rebuilt for the web with an AI agent that drives the whole app through prompts.",
    url: "https://chat.z.ai",
    siteName: "Fiberpro ERP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fiberpro ERP — AI Agent Harness",
    description: "Garment/textile ERP rebuilt for the web with an AI agent that drives the whole app through prompts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
