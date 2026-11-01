import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "UNILUS Navigator",
    short_name: "UNILUS",
    description: "Navigate campus, book rooms and chat with fellow students.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f9",
    theme_color: "#1769c2",
    categories: ["education", "navigation"],
    icons: [
      { src: "/unilus-navigator.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Navigate", url: "/navigation" },
      { name: "Messages", url: "/chat" },
      { name: "Bookings", url: "/bookings" },
    ],
  };
}
