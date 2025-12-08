import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Types for podcast data
export interface PodcastInfo {
  title: string;
  description: string;
  imageUrl?: string;
  author: string;
  website?: string;
  email?: string;
  language?: string;
}

export interface PodcastEpisode {
  guid: string;
  title: string;
  description: string;
  duration?: string;
  publishDate: string;
  audioUrl: string;
  size?: string;
  episodeNumber?: number;
}

// Server function to fetch and parse RSS feed
export const fetchPodcastData = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const rssUrl = "https://anchor.fm/s/51db89f8/podcast/rss";
      const response = await fetch(rssUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // Parse XML manually (since we're in a server environment)
      const podcastInfo = extractPodcastInfo(xmlText);
      const episodes = extractEpisodes(xmlText);

      return {
        podcastInfo,
        episodes,
      };
    } catch (error) {
      console.error("Error fetching podcast data:", error);
      throw new Error("Failed to load podcast data");
    }
  }
);

// Helper function to extract podcast info from RSS XML
function extractPodcastInfo(xml: string): PodcastInfo {
  // Extract title
  const titleMatch = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
  const title = titleMatch ? titleMatch[1] : "Pludastund";

  // Extract description
  const descMatch = xml.match(
    /<description><!\[CDATA\[(.*?)\]\]><\/description>/
  );
  const description = descMatch
    ? descMatch[1]
    : "A Low German (Plautdietsche) podcast about creativity, entrepreneurship, and life.";

  // Extract author/creator
  const authorMatch =
    xml.match(/<itunes:author>(.*?)<\/itunes:author>/) ||
    xml.match(/<managingEditor>(.*?)<\/managingEditor>/);
  const author = authorMatch ? authorMatch[1] : "David and Orlando";

  // Extract website
  const linkMatch = xml.match(/<link>(.*?)<\/link>/);
  const website = linkMatch ? linkMatch[1] : undefined;

  // Extract image
  const imageMatch =
    xml.match(/<itunes:image href="(.*?)"/) ||
    xml.match(/<image>.*?<url>(.*?)<\/url>.*?<\/image>/s);
  const imageUrl = imageMatch ? imageMatch[1] : undefined;

  return {
    title,
    description,
    author,
    website,
    imageUrl,
  };
}

// Helper function to extract episodes from RSS XML
function extractEpisodes(xml: string): PodcastEpisode[] {
  const episodes: PodcastEpisode[] = [];

  // Find all item elements
  const itemRegex = /<item>(.*?)<\/item>/gs;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    // Extract GUID
    const guidMatch = itemXml.match(/<guid.*?>(.*?)<\/guid>/);
    const guid = guidMatch
      ? guidMatch[1].split("/").pop() || guidMatch[1]
      : `episode-${Date.now()}`;

    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const title = titleMatch ? titleMatch[1] : "Untitled Episode";

    // Extract description
    const descMatch = itemXml.match(
      /<description><!\[CDATA\[(.*?)\]\]><\/description>/
    );
    let description = descMatch ? descMatch[1] : "";

    // Clean up HTML tags from description
    description = description
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim();

    // Extract publish date
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const publishDate = pubDateMatch
      ? formatDate(pubDateMatch[1])
      : new Date().toISOString().split("T")[0];

    // Extract audio URL
    const enclosureMatch = itemXml.match(/<enclosure.*?url="(.*?)"/);
    const audioUrl = enclosureMatch ? enclosureMatch[1] : "";

    // Extract duration
    const durationMatch = itemXml.match(
      /<itunes:duration>(.*?)<\/itunes:duration>/
    );
    const duration = durationMatch ? durationMatch[1] : undefined;

    // Extract episode number
    const episodeMatch = itemXml.match(
      /<itunes:episode>(.*?)<\/itunes:episode>/
    );
    const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : undefined;

    // Extract file size (approximate)
    const lengthMatch = itemXml.match(/<enclosure.*?length="(.*?)"/);
    const size = lengthMatch
      ? formatFileSize(parseInt(lengthMatch[1]))
      : undefined;

    if (audioUrl) {
      episodes.push({
        guid,
        title,
        description,
        duration,
        publishDate,
        audioUrl,
        size,
        episodeNumber,
      });
    }
  }

  return episodes.sort(
    (a, b) =>
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );
}

// Helper function to format dates
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Server function to download podcast episode and stream to client
export const downloadPodcastEpisode = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      audioUrl: z.string().url(),
      filename: z.string(),
    })
  )
  .handler(async ({ data }) => {
    try {
      // Fetch the audio file from the external URL
      const response = await fetch(data.audioUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      // Get the content type and size
      const contentType = response.headers.get("content-type") || "audio/mpeg";
      const contentLength = response.headers.get("content-length");

      // Create headers for the download
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${data.filename}.mp3"`,
        "Cache-Control": "no-cache",
      };

      if (contentLength) {
        headers["Content-Length"] = contentLength;
      }

      // Stream the response body directly to the client
      return new Response(response.body, { headers });
    } catch (error) {
      console.error("Error downloading podcast:", error);
      return new Response("Failed to download podcast", { status: 500 });
    }
  });
