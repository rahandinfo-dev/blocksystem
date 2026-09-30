import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BlockSystem",
    short_name: "BlockSystem",
    description: "Professional block and construction calculation workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDE6CC",
    theme_color: "#0F2053",
    orientation: "any",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
