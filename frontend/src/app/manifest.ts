import type { MetadataRoute } from "next";

/** Installable web app (PWA): "Install app" / "Add to Home screen" on laptop, tablet and phone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kafe CRM",
    short_name: "Kafe CRM",
    description: "Kasir, pelanggan, kamera, dan analitik kafe",
    start_url: "/pos",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FAF3E8",
    theme_color: "#70422A",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
