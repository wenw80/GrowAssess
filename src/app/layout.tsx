import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowAssess - Employee Assessment Platform",
  description: "Cognitive tests and assessments for job candidates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="corporate">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
