import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agatha Living Operations",
    short_name: "Agatha Living",
    description: "Property operations, cleaner jobs, payments, and booking workflows.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f5efe6",
    theme_color: "#171512",
    orientation: "portrait"
  };
}
