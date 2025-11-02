import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "Diyet Danışmanlık Hizmetleri",
    short_name: "Diyet",
    description: "Profesyonel diyet ve beslenme danışmanlığı hizmetleri",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/image.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/image.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    categories: ["health", "lifestyle"],
    lang: "tr",
    dir: "ltr",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}

