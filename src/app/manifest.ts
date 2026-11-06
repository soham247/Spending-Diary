import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Spending Diary", short_name: "Spending Diary", description: "Split expenses and track your share of spending.", start_url: "/home", display: "standalone", icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }] };
}
