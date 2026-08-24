import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VolpeVox",
    short_name: "VolpeVox",
    description: "Créez vos devis en dictant, en quelques secondes",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1b2a",
    theme_color: "#0d1b2a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
