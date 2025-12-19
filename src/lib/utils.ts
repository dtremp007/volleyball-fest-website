import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";

    return `http://localhost:${process.env.PORT ?? 3000}`;
  })();

  return `${base}/api/trpc`;
}

export const seo = ({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
}: {
  title: string;
  description?: string;
  image?: string;
  keywords?: string;
  url?: string;
  type?: "website" | "article" | "event";
}) => {
  const tags = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    // Twitter Card
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    // Open Graph
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:site_name", content: "Volleyball Fest" },
    { property: "og:locale", content: "es_MX" },
    ...(url ? [{ property: "og:url", content: url }] : []),
    ...(image
      ? [
          { name: "twitter:image", content: image },
          { property: "og:image", content: image },
          { property: "og:image:alt", content: title },
        ]
      : []),
  ];

  return tags;
};
