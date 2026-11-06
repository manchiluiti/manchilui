import type { Metadata, Viewport } from "next";
import "./globals.css";

const inter={variable:"x"};

export const metadata: Metadata = {
  metadataBase: new URL("https://manchilui.com"),
  title: { default: "Manchilui Training Institute", template: "%s · Manchilui Training Institute" },
  description: "Diploma in Clearing and Forwarding in Eastrise, Chipata, Zambia. One year of practical training in customs procedure, shipping and cargo handling.",
  applicationName: "Manchilui",
  appleWebApp: { capable: true, title: "Manchilui", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0B1F4D", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
