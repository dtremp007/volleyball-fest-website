import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardHeader } from "~/components/ui/card";
import { useState } from "react";
import {
  fetchPodcastData,
  downloadPodcastEpisode,
  type PodcastEpisode,
} from "~/functions/podcast";
import { ArrowDownToLine, Play } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    return await fetchPodcastData();
  },
  // Cache the podcast data for 5 minutes since RSS feeds don't update very frequently
  staleTime: 5 * 60 * 1000, // 5 minutes
  component: RouteComponent,
});

function RouteComponent() {
  const { podcastInfo, episodes } = Route.useLoaderData();
  const [downloadingEpisode, setDownloadingEpisode] = useState<string | null>(
    null
  );

  const handleDownload = async (episode: PodcastEpisode) => {
    try {
      setDownloadingEpisode(episode.guid);

      // Call our server function to download the episode
      const response = await downloadPodcastEpisode({
        data: {
          audioUrl: episode.audioUrl,
          filename: `${episode.title.replace(/[^a-zA-Z0-9]/g, "_")}`,
        },
      });

      // Create a blob URL and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${episode.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingEpisode(null);
    }
  };

  const handleListen = (episode: PodcastEpisode) => {
    // Open audio in a new tab for listening
    window.open(episode.audioUrl, "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Podcast Header */}
      <div className="text-center space-y-4">
        {podcastInfo.imageUrl && (
          <div className="flex justify-center">
            <img
              src={podcastInfo.imageUrl}
              alt={podcastInfo.title}
              className="w-32 h-32 rounded-xl shadow-lg"
            />
          </div>
        )}
        <h1 className="text-4xl font-bold">{podcastInfo.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {podcastInfo.description}
        </p>
        <div className="text-sm text-muted-foreground">
          By {podcastInfo.author}
        </div>
        {podcastInfo.website && (
          <div className="text-sm">
            <a
              href={podcastInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {podcastInfo.website}
            </a>
          </div>
        )}
      </div>

      {/* Listening Links */}
      <Card className="p-6">
        <CardHeader className="pb-4">
          <h2 className="text-2xl font-semibold">
            Listen on Your Favorite Platform
          </h2>
        </CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            className="flex flex-col items-center gap-2 rounded-md p-2 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
            onClick={() =>
              window.open("https://www.youtube.com/@Pludastund-xe2bo", "_blank")
            }
          >
            <img
              height="32"
              width="32"
              src="https://cdn.simpleicons.org/youtube"
            />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-xs">YouTube</span>
              <span className="text-xs text-muted-foreground">
                Watch episodes
              </span>
            </div>
          </button>
          <button
            className="flex flex-col items-center gap-2 rounded-md p-2 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
            onClick={() =>
              window.open(
                "https://podcasts.apple.com/us/podcast/pludastund/id1602730262",
                "_blank"
              )
            }
          >
            <img
              height="32"
              width="32"
              src="https://cdn.simpleicons.org/applepodcasts"
            />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-xs">Apple Podcasts</span>
              <span className="text-xs text-muted-foreground">
                Listen on iOS
              </span>
            </div>
          </button>
          <button
            className="flex flex-col items-center gap-2 rounded-md p-2 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
            onClick={() =>
              window.open("https://open.spotify.com/show/0bgkCoXa1M80zD2v1jpCNT", "_blank")
            }
          >
            <img
              height="32"
              width="32"
              src="https://cdn.simpleicons.org/spotify"
            />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-xs">Spotify</span>
              <span className="text-xs text-muted-foreground">Stream now</span>
            </div>
          </button>
          <button
            className="flex flex-col items-center gap-2 rounded-md p-2 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
            onClick={() =>
              window.open("https://pca.st/podcast/47b15e20-5742-013d-9be2-0afff3401fad", "_blank")
            }
          >
            <img
              height="32"
              width="32"
              src="https://cdn.simpleicons.org/pocketcasts"
            />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-xs">Pocket Casts</span>
              <span className="text-xs text-muted-foreground">Podcast app</span>
            </div>
          </button>
        </div>
      </Card>

      {/* Episodes List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Recent Episodes</h2>
        <div className="space-y-4">
          {episodes.slice(0, 10).map((episode) => (
            <Card
              key={episode.guid}
              className="p-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                      {episode.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {episode.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      {new Date(episode.publishDate).toLocaleDateString("en-US")}
                    </span>
                    {episode.duration ? <span>{episode.duration}</span> : null}
                    {episode.size ? <span>{episode.size}</span> : null}
                    {typeof episode.episodeNumber === 'number' && Number.isFinite(episode.episodeNumber) ? (
                      <span>Episode {episode.episodeNumber}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleListen(episode);
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Listen
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleDownload(episode);
                      }}
                      disabled={downloadingEpisode === episode.guid}
                    >
                      <ArrowDownToLine className="w-4 h-4 mr-1" />
                      {downloadingEpisode === episode.guid
                        ? "Downloading..."
                        : "Download"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
