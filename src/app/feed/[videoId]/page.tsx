"use client";

import React, { useEffect, useState } from "react";

// Video type based on VideoCard in feed/page.tsx, extended for player needs
type Video = {
  id: string;
  title: string;
  thumbnailURL: string | null;
  videoURL: string | null;
  qualities?: Record<string, string>;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: Date | string;
  description?: string | null;
  user: {
    id: string;
    name: string;
    imageURL: string;
  };
};
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, Share2, Flag, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function VideoQualityPlayer({ video }: { video: Video }) {
  const qualities = video.qualities || (video.videoURL ? { Default: video.videoURL } : {});
  const [selectedQuality, setSelectedQuality] = useState(Object.keys(qualities)[0] || "");
  const [showPoster, setShowPoster] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleEnded = () => {
    setShowPoster(true);
    setShowReplay(true);
  };
  const handlePlay = () => {
    setShowPoster(false);
    setShowReplay(false);
  };
  const handleError = () => {
    setShowPoster(true);
    setShowReplay(false);
  };
  const handleReplay = () => {
    setShowPoster(false);
    setShowReplay(false);
    videoRef.current?.play();
  };

  if (!video.videoURL && !video.qualities) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#181818] rounded-xl border border-neutral-800 shadow-2xl">
        <span className="text-white">Video not available</span>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col relative bg-[#181818] rounded-xl border border-neutral-800 shadow-2xl overflow-hidden">
      <div className="relative aspect-video w-full bg-[#181818] flex items-center justify-center">
        {selectedQuality && qualities[selectedQuality] ? (
          <video
            ref={videoRef}
            key={selectedQuality}
            src={qualities[selectedQuality]}
            controls
            autoPlay
            className="w-full h-full object-contain rounded-xl bg-[#181818] shadow-lg border border-neutral-900"
            poster={video.thumbnailURL || "/default-poster.jpg"}
            onEnded={handleEnded}
            onPlay={handlePlay}
            onError={handleError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white bg-[#181818]">
            <p>Video not available</p>
          </div>
        )}
        {(showPoster || showReplay) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnailURL || "/default-poster.jpg"}
              alt="Video thumbnail"
              className="w-full h-full object-cover rounded-xl opacity-80"
            />
            {showReplay && (
              <button
                onClick={handleReplay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black rounded-full p-5 shadow-2xl text-3xl border-4 border-white/80"
                aria-label="Replay"
                type="button"
                style={{ boxShadow: '0 4px 24px 4px rgba(0,0,0,0.25)' }}
              >
                &#8635;
              </button>
            )}
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-lg font-semibold drop-shadow-lg bg-black/60 px-4 py-2 rounded-full">
              Video Ended
            </span>
          </div>
        )}
      </div>
      {Object.keys(qualities).length > 1 && (
        <div className="mt-3 flex items-center gap-2 px-2">
          <label htmlFor="quality" className="text-sm text-gray-200 font-medium drop-shadow">Quality:</label>
          <select
            id="quality"
            value={selectedQuality}
            onChange={e => setSelectedQuality(e.target.value)}
            className="bg-neutral-800 text-white rounded px-2 py-1 border border-neutral-700 focus:ring-2 focus:ring-blue-500 shadow"
          >
            {Object.keys(qualities).map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default function VideoPage() {
  const [createdAgo, setCreatedAgo] = useState<string>("");
  const params = useParams();
  const videoId = params.videoId as string;

  const { data: video, isLoading, error } = trpc.videos.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  useEffect(() => {
    if (video?.createdAt) {
      setCreatedAgo(formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }));
    }
  }, [video?.createdAt]);

  const incrementViews = trpc.videos.incrementViews.useMutation();

  // Increment view count when video loads
  useEffect(() => {
    if (videoId) {
      incrementViews.mutate({ id: videoId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 bg-neutral-900">
        <Skeleton className="aspect-video w-full rounded-xl mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-neutral-900">
        <h1 className="text-2xl font-bold mb-2">Video not found</h1>
        <p className="text-gray-500 mb-4">
          This video may have been removed or doesn&apos;t exist.
        </p>
        <Link href="/feed">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 bg-neutral-900 text-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Section */}
        <div className="lg:col-span-2 space-y-4">
            {/* Video Player with Quality Selector */}
            <div className="aspect-video rounded-xl overflow-hidden border border-neutral-800 shadow-2xl bg-[#181818]">
              {video.videoURL ? (
                <VideoQualityPlayer video={video} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white bg-[#181818]">
                  <p>Video not available</p>
                </div>
              )}
            </div>

          {/* Title */}
          <h1 className="text-xl font-bold">{video.title}</h1>

          {/* Stats and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-2 text-gray-400">
              <Eye className="h-4 w-4" />
              <span>{formatViewCount(video.viewCount)} views</span>
              <span>•</span>
              <span suppressHydrationWarning>{createdAgo}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-neutral-700 rounded-full">
                <Button variant="ghost" size="sm" className="rounded-l-full gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  {formatViewCount(video.likeCount)}
                </Button>
                <div className="w-px h-6 bg-neutral-600" />
                <Button variant="ghost" size="sm" className="rounded-r-full gap-1">
                  <ThumbsDown className="h-4 w-4" />
                  {formatViewCount(video.dislikeCount)}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="gap-1">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="ghost" size="sm" className="gap-1">
                <Flag className="h-4 w-4" />
                Report
              </Button>
            </div>
          </div>

          {/* Channel Info */}
          <div className="flex items-start gap-4 p-4 bg-neutral-800 rounded-xl">
            <Avatar className="h-12 w-12">
              <AvatarImage src={video.user.imageURL} />
              <AvatarFallback>{video.user.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/channel/${video.user.id}`} className="font-semibold hover:underline">
                    {video.user.name}
                  </Link>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">Subscribe</Button>
              </div>
              {video.description && (
                <div className="mt-3">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section Placeholder */}
          <div className="border-t pt-4">
            <h2 className="font-semibold mb-4">Comments</h2>
            <p className="text-gray-400 text-center py-8">
              Comments coming soon...
            </p>
          </div>
        </div>

        {/* Sidebar - Related Videos */}
        <div className="space-y-4">
          <h2 className="font-semibold">Related Videos</h2>
          <p className="text-gray-400 text-center py-8">
            More videos coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}