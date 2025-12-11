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
import { toast } from "sonner";

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
    toast.info("Generating AI thumbnail...", {
      description: "This may take a few seconds",
    });
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
      toast.success("AI thumbnail generated!", {
        description: "Your thumbnail is ready",
      });
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      toast.error("Failed to generate thumbnail", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const createVideo = trpc.videos.create.useMutation({
    onSuccess: (data) => {
      setStep("done");
      toast.success("Video uploaded successfully!", {
        description: "Redirecting to your video...",
      });
      // Redirect to the video after 2 seconds
      setTimeout(() => {
        router.push(`/feed/${data.id}`);
      }, 2000);
    },
    onError: (error) => {
      toast.error("Failed to upload video", {
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl || !title) {
      toast.error("Missing required fields", {
        description: "Please upload a video and enter a title",
      });
      return;
    }

    setIsSubmitting(true);
    
    createVideo.mutate({
      title,
      description,
      videoURL: videoUrl,
      thumbnailURL: thumbnailUrl || undefined,
      category: category || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/feed" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold dark:text-white">Upload Video</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${step === "upload" ? "bg-blue-600 text-white" : step === "details" || step === "done" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {step === "details" || step === "done" ? <CheckCircle className="h-5 w-5" /> : "1"}
            </div>
            <span className="font-medium text-sm sm:text-base">Upload</span>
          </div>
          <div className="w-8 sm:w-16 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-2 ${step === "details" ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${step === "details" ? "bg-blue-600 text-white" : step === "done" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {step === "done" ? <CheckCircle className="h-5 w-5" /> : "2"}
            </div>
            <span className="font-medium text-sm sm:text-base">Details</span>
          </div>
          <div className="w-8 sm:w-16 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-2 ${step === "done" ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${step === "done" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
              {step === "done" ? <CheckCircle className="h-5 w-5" /> : "3"}
            </div>
            <span className="font-medium text-sm sm:text-base">Done</span>
          </div>
        </div>

        {/* Step 1: Upload Video */}
        {step === "upload" && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
                <Video className="h-5 w-5" />
                Upload your video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Upload a video file (max 512MB, recommended 3-5 minutes for demo)
                </p>
                
                {/* Upload Button - Alternative */}
                <div className="flex flex-col items-center gap-4">
                  <UploadButton
                    endpoint="videoUploader"
                    onClientUploadComplete={(res) => {
                      console.log("Upload complete:", res);
                      if (res && res[0]) {
                        toast.success("Video file uploaded!", {
                          description: "Now add details for your video",
                        });
                        setVideoUrl(res[0].ufsUrl);
                        setVideoName(res[0].name);
                        setTitle(res[0].name.replace(/\.[^/.]+$/, ""));
                        setStep("details");
                      }
                    }}
                    onUploadError={(error: Error) => {
                      console.error("Upload error:", error);
                      toast.error("Upload failed", {
                        description: error.message,
                      });
                    }}
                    onUploadBegin={(name) => {
                      console.log("Upload started:", name);
                      toast.info("Uploading video...", {
                        description: name,
                      });
                    }}
                  />
                  <p className="text-sm text-gray-400 dark:text-gray-500">or drag and drop below</p>
                </div>

                <UploadDropzone
                  endpoint="videoUploader"
                  onClientUploadComplete={(res) => {
                    console.log("Upload complete:", res);
                    if (res && res[0]) {
                      toast.success("Video file uploaded!", {
                        description: "Now add details for your video",
                      });
                      setVideoUrl(res[0].ufsUrl);
                      setVideoName(res[0].name);
                      setTitle(res[0].name.replace(/\.[^/.]+$/, "")); // Remove extension for title
                      setStep("details");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    console.error("Upload error:", error);
                    toast.error("Upload failed", {
                      description: error.message,
                    });
                  }}
                  onUploadBegin={(name) => {
                    console.log("Upload started:", name);
                  }}
                  className="ut-label:text-lg ut-allowed-content:text-gray-500 dark:ut-allowed-content:text-gray-400 ut-uploading:cursor-not-allowed border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 hover:border-blue-500 dark:hover:border-blue-400 transition-colors dark:bg-gray-800"
                />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  By uploading, you agree to NepTube&apos;s Terms of Service
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Video Details */}
        {step === "details" && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl dark:text-white">Video Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-base dark:text-gray-300">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter video title"
                        required
                        maxLength={100}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base"
                      />
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{title.length}/100</p>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-base dark:text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell viewers about your video"
                        rows={5}
                        maxLength={5000}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base"
                      />
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{description.length}/5000</p>
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-base dark:text-gray-300">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="dark:text-white text-base">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Thumbnail */}
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
                      <ImageIcon className="h-5 w-5" />
                      Thumbnail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
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
                            <span className="bg-white px-2 text-gray-500">Or upload</span>
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
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
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
