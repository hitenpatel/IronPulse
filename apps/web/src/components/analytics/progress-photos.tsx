"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";

export function ProgressPhotos() {
  const utils = trpc.useUtils();
  const { data: photos, isLoading } = trpc.progressPhoto.list.useQuery();
  const getUploadUrl = trpc.progressPhoto.getUploadUrl.useMutation();
  const createPhoto = trpc.progressPhoto.create.useMutation({
    onSuccess: () => utils.progressPhoto.list.invalidate(),
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Get presigned upload URL
      const { uploadUrl, photoUrl } = await getUploadUrl.mutateAsync({
        contentType: file.type || "image/jpeg",
      });

      // Upload file to S3
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Create photo record
      const today = new Date().toISOString().split("T")[0];
      await createPhoto.mutateAsync({ photoUrl, date: today });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5" />
            Progress Photos
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-xs text-destructive mb-3">{error}</p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md bg-muted aspect-square"
              />
            ))}
          </div>
        ) : !photos || photos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No progress photos yet. Upload your first photo to start tracking.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhotoCard({
  photo,
}: {
  photo: { id: string; photoUrl: string; imageUrl: string; date: string | Date; notes?: string | null };
}) {
  const utils = trpc.useUtils();
  const deletePhoto = trpc.progressPhoto.delete.useMutation({
    onSuccess: () => utils.progressPhoto.list.invalidate(),
  });
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this photo?")) return;
    setDeleting(true);
    try {
      await deletePhoto.mutateAsync({ id: photo.id });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative group">
      <div className="aspect-square rounded-md bg-muted border overflow-hidden">
        <img
          src={photo.imageUrl}
          alt={`Progress photo from ${new Date(photo.date).toLocaleDateString()}`}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {new Date(photo.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      {photo.notes && (
        <p className="text-[10px] text-muted-foreground truncate">{photo.notes}</p>
      )}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
        title="Delete photo"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}
