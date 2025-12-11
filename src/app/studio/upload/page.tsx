"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { UploadDropzone, UploadButton } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Video, ImageIcon, ArrowLeft, Loader2, CheckCircle, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const categories = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Sports",
  "News",
  "Comedy",
  "Technology",
  "Travel",
  "Other",
];

export default function UploadVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "details" | "done">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  // Only one video file is now supported
  const [videoName, setVideoName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const generateAIThumbnail = async () => {
    if (!title) {
      alert("Please enter a title first to generate a thumbnail");
      return;
    }

    setIsGeneratingThumbnail(true);
    try {
      const response = await fetch("/api/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate thumbnail");
      }

      setThumbnailUrl(data.thumbnailUrl);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      alert(error instanceof Error ? error.message : "Failed to generate thumbnail");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const createVideo = trpc.videos.create.useMutation({
    onSuccess: (data) => {
      setStep("done");
      // Redirect to the video after 2 seconds
      setTimeout(() => {
        router.push(`/feed/${data.id}`);
      }, 2000);
    },
    onError: (error) => {
      alert("Error creating video: " + error.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl || !title) {
      alert("Please upload a video file and enter a title");
      return;
    }
    setIsSubmitting(true);
    createVideo.mutate({
      title,
      description,
      videoURL: videoUrl,
      qualities: undefined, // No multi-quality support
      thumbnailURL: thumbnailUrl || undefined,
      category: category || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <header className="bg-neutral-800 border-b border-neutral-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/feed" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold">Upload Video</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-blue-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "upload" ? "bg-blue-600 text-white" : step === "details" || step === "done" ? "bg-green-500 text-white" : "bg-neutral-700 text-white"}`}>
              {step === "details" || step === "done" ? <CheckCircle className="h-5 w-5" /> : "1"}
            </div>
            <span className="font-medium">Upload</span>
          </div>
          <div className="w-16 h-0.5 bg-neutral-700" />
          <div className={`flex items-center gap-2 ${step === "details" ? "text-blue-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "details" ? "bg-blue-600 text-white" : step === "done" ? "bg-green-500 text-white" : "bg-neutral-700 text-white"}`}>
              {step === "done" ? <CheckCircle className="h-5 w-5" /> : "2"}
            </div>
            <span className="font-medium">Details</span>
          </div>
          <div className="w-16 h-0.5 bg-neutral-700" />
          <div className={`flex items-center gap-2 ${step === "done" ? "text-green-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "done" ? "bg-green-500 text-white" : "bg-neutral-700 text-white"}`}>
              {step === "done" ? <CheckCircle className="h-5 w-5" /> : "3"}
            </div>
            <span className="font-medium">Done</span>
          </div>
        </div>

        {/* Step 1: Upload Video */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Upload your video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload a video file (max 512MB, recommended 3-5 minutes for demo)
                </p>
                <UploadDropzone
                  endpoint="videoUploader"
                  onClientUploadComplete={(res) => {
                    console.log("Upload complete:", res);
                    if (res && res[0]) {
                      setVideoUrl(res[0].ufsUrl);
                      setVideoName(res[0].name);
                      setTitle(res[0].name.replace(/\.[^/.]+$/, "")); // Remove extension for title
                      setStep("details");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    console.error("Upload error:", error);
                    alert(`Upload failed: ${error.message}`);
                  }}
                  onUploadBegin={(name) => {
                    console.log("Upload started:", name);
                  }}
                  className="ut-label:text-lg ut-allowed-content:text-gray-500 ut-uploading:cursor-not-allowed border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 transition-colors"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Video Details */}
        {step === "details" && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Form */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Video Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-white">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter video title"
                        required
                        maxLength={100}
                        className="bg-neutral-800 text-white border-gray-600 placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-white">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell viewers about your video"
                        rows={5}
                        maxLength={5000}
                        className="bg-neutral-800 text-white border-gray-600 placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">{description.length}/5000</p>
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-white">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="text-white bg-neutral-800 border-gray-600 focus:ring-2 focus:ring-blue-500">
                          <SelectValue placeholder="Select a category" className="text-white" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 text-white border-gray-600">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-white bg-neutral-800 focus:bg-blue-600 focus:text-white data-[state=checked]:bg-blue-600 data-[state=checked]:text-white">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Thumbnail - moved out of category section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <ImageIcon className="h-5 w-5" />
                      Thumbnail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload a custom thumbnail or generate one with AI
                    </p>
                    {thumbnailUrl ? (
                      <div className="relative w-full max-w-md">
                        <Image
                          src={thumbnailUrl}
                          alt="Video thumbnail"
                          width={400}
                          height={225}
                          className="w-full rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setThumbnailUrl("")}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* AI Generate Button */}
                        <Button
                          type="button"
                          onClick={generateAIThumbnail}
                          disabled={isGeneratingThumbnail || !title}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        >
                          {isGeneratingThumbnail ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating with AI...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate AI Thumbnail
                            </>
                          )}
                        </Button>
                        {!title && (
                          <p className="text-xs text-amber-600 text-center">
                            Enter a title above to enable AI thumbnail generation
                          </p>
                        )}
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-neutral-800 px-2 text-gray-300">Or upload</span>
                          </div>
                        </div>

                        <UploadDropzone
                          endpoint="thumbnailUploader"
                          onClientUploadComplete={(res) => {
                            if (res && res[0]) {
                              setThumbnailUrl(res[0].ufsUrl);
                            }
                          }}
                          onUploadError={(error: Error) => {
                            alert(`Thumbnail upload failed: ${error.message}`);
                          }}
                          className="ut-label:text-sm border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition-colors"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full rounded-lg bg-black"
                      />
                      <p className="font-medium text-sm truncate">
                        {title || "Untitled Video"}
                      </p>
                      <p className="text-xs text-gray-500">{videoName}</p>
                      {/* No qualities badges needed for single file upload */}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-4 rounded-lg shadow-lg border-2 border-blue-700 transition-all"
                  size="lg"
                  disabled={isSubmitting || !title || !videoUrl}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Publish Video
                    </>
                  )}
                </Button>
                                 className="ut-label:text-sm border-2 border-dashed border-blue-700 rounded-lg p-4 hover:border-blue-500 transition-colors bg-neutral-800"
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Video Published!</h2>
              <p className="text-gray-600 mb-4">
                Your video has been uploaded successfully and is now live.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to your video...
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
