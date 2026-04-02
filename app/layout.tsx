import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// Heebo supports Hebrew and Latin — correct font for an RTL Hebrew application
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chamama Hackathon",
  description: "Chamama Hackathon System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" lang="he" className={`${heebo.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
