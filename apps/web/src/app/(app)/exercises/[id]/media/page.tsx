"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Upload, Image as ImageIcon, Video } from "lucide-react";

type MediaType = "image" | "video";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
type AllowedContentType = (typeof IMAGE_TYPES)[number] | (typeof VIDEO_TYPES)[number];

function isAllowedContentType(type: string): type is AllowedContentType {
  return (
    (IMAGE_TYPES as readonly string[]).includes(type) ||
    (VIDEO_TYPES as readonly string[]).includes(type)
  );
}

export default function ExerciseMediaPage() {
  const { id } = useParams<{ id: string }>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const { data, isLoading } = trpc.exercise.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  const uploadMediaMutation = trpc.exercise.uploadExerciseMedia.useMutation();

  async function handleFileUpload(file: File, mediaType: MediaType) {
    if (!isAllowedContentType(file.type)) {
      setMessage({ type: "error", text: `File type "${file.type}" is not supported.` });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const { uploadUrl } = await uploadMediaMutation.mutateAsync({
        exerciseId: id,
        contentType: file.type as AllowedContentType,
        mediaType,
      });

      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!res.ok) {
        throw new Error("Upload to storage failed.");
      }

      setMessage({ type: "success", text: `${mediaType === "image" ? "Image" : "Video"} uploaded successfully.` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(mediaType: MediaType) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFileUpload(file, mediaType);
      }
      // Reset input so the same file can be re-uploaded if needed
      e.target.value = "";
    };
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Exercises
        </Link>
        <p className="text-center text-muted-foreground py-12">Exercise not found.</p>
      </div>
    );
  }

  const { exercise } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/exercises/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {exercise.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Manage Media</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload images and videos for <span className="font-medium">{exercise.name}</span>.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Image upload */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Upload Image</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, or WebP
                </p>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFileChange("image")}
              />
              <Button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : "Choose Image"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video upload */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Upload Video</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  MP4, WebM, or MOV
                </p>
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={onFileChange("video")}
              />
              <Button
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : "Choose Video"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing media summary */}
      <Card>
        <CardContent className="py-4">
          <h2 className="mb-3 font-semibold">Current Media</h2>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{exercise.imageUrls.length}</span>{" "}
              image{exercise.imageUrls.length !== 1 ? "s" : ""}
            </span>
            <span>
              <span className="font-medium text-foreground">{exercise.videoUrls.length}</span>{" "}
              video{exercise.videoUrls.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
