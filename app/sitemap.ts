import { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(
  /\/$/,
  ""
);

const staticRoutes = [
  "",
  "/diets",
  "/clients",
  "/clients/new",
  "/besinler",
  "/templates",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return staticRoutes.map((path) => ({
    url: `${baseUrl}${path}`,
    priority: path === "" ? 1 : 0.8,
    changeFrequency: "weekly",
  }));
}

