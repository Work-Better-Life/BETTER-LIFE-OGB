import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Better Life OGB",
    short_name: "Better Life OGB",
    description: "Track student score trends over time.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#2f7a49",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
