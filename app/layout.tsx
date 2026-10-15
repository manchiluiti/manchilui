import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Manchilui Training Institute", template: "%s · Manchilui Training Institute" },
  description: "Diploma in Clearing and Forwarding in Eastrise, Chipata, Zambia. Six months of practical training in customs procedure, shipping and cargo handling.",
};

export const viewport: Viewport = { themeColor: "#0B1F4D", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
