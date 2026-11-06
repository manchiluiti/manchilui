import type { MetadataRoute } from "next";

/** Makes the site installable as an app ("Add to Home screen" / "Install app"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/open",
    name: "Manchilui Training Institute",
    short_name: "Manchilui",
    description: "Student and staff portal of Manchilui Training Institute, Chipata.",
    start_url: "/open",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#0B1F4D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Student portal", url: "/portal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Staff panel", url: "/admin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
