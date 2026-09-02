import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const viewport: Viewport = {
  themeColor: "#00685b",
};

export const metadata: Metadata = {
  title: "Sameer Library",
  description: "Sameer Library - Multi-branch library seat management and online seat booking system",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Sameer Library",
    description: "Multi-branch library seat management and reservation system",
    siteName: "Sameer Library",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Sameer Library Logo" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

