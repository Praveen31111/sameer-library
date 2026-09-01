import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";


export const metadata: Metadata = {
  title: "Sameer Library - Modern Seat Booking",
  description: "Multi-branch library seat management system with online booking, payments, and fingerprint attendance",
  keywords: ["library", "seat booking", "study space", "Lucknow"],
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

