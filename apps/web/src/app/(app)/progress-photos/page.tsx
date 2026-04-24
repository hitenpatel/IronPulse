"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, Trash2, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

/**
 * Web progress photos. Reaches parity with the mobile screen:
 *   - upload a single photo with date + notes,
 *   - grid of recent photos,
 *   - side-by-side before/after comparison (pick any two).
 *
 * Uses the existing `progressPhoto.*` tRPC router. Uploads go directly to
 * S3 via the presigned URL returned by `progressPhoto.getUploadUrl`, so
 * photo bytes never transit the API server.
 */
export default function ProgressPhotosPage() {
  const list = trpc.progressPhoto.list.useQuery();
  const getUploadUrl = trpc.progressPhoto.getUploadUrl.useMutation();
  const createPhoto = trpc.progressPhoto.create.useMutation({
    onSuccess: () => list.refetch(),
  });
  const deletePhoto = trpc.progressPhoto.delete.useMutation({
    onSuccess: () => list.refetch(),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDate, setPendingDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [pendingNotes, setPendingNotes] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [compareLeftId, setCompareLeftId] = useState<string | null>(null);
  const [compareRightId, setCompareRightId] = useState<string | null>(null);

  const photos = list.data ?? [];
  const compareLeft = useMemo(
    () => photos.find((p) => p.id === compareLeftId) ?? null,
    [photos, compareLeftId],
  );
  const compareRight = useMemo(
    () => photos.find((p) => p.id === compareRightId) ?? null,
    [photos, compareRightId],
  );

  async function handleUpload() {
    if (!pendingFile) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { uploadUrl, photoUrl } = await getUploadUrl.mutateAsync({
        contentType: pendingFile.type || "image/jpeg",
      });
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": pendingFile.type || "image/jpeg" },
        body: pendingFile,
      });
      if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);
      await createPhoto.mutateAsync({
        photoUrl,
        date: pendingDate,
        notes: pendingNotes || undefined,
      });
      setPendingFile(null);
      setPendingNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleCompareSelect(id: string) {
    if (compareLeftId === null) setCompareLeftId(id);
    else if (compareRightId === null && id !== compareLeftId) setCompareRightId(id);
    else {
      // Both slots full — start over with this as the new left.
      setCompareLeftId(id);
      setCompareRightId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Camera className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Progress photos</h1>
            <p className="text-sm text-muted-foreground">
              Capture transformation over time — compare any two side by side.
            </p>
          </div>
        </div>
      </header>

      {/* Upload form */}
      <section
        data-testid="progress-photos-upload"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Add photo
        </h2>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              data-testid="progress-photos-file"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:opacity-90"
            />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  value={pendingDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-1 flex-col text-xs text-muted-foreground">
                Notes (optional)
                <input
                  type="text"
                  value={pendingNotes}
                  onChange={(e) => setPendingNotes(e.target.value)}
                  maxLength={2000}
                  placeholder="Bulk week 4…"
                  className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>
          <div className="self-end">
            <Button
              onClick={handleUpload}
              disabled={!pendingFile || uploading}
              data-testid="progress-photos-upload-btn"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      </section>

      {/* Side-by-side compare */}
      {(compareLeft || compareRight) && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Side-by-side
            </h2>
            <button
              onClick={() => {
                setCompareLeftId(null);
                setCompareRightId(null);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close comparison"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[compareLeft, compareRight].map((p, idx) => (
              <div key={idx} className="space-y-2">
                {p ? (
                  <>
                    <img
                      src={p.imageUrl}
                      alt={`Progress photo ${new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <p className="text-sm font-medium">
                      {new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground">{p.notes}</p>
                    )}
                  </>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Pick a photo below
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Gallery
          </h2>
          <p className="text-xs text-muted-foreground">
            {compareLeftId === null
              ? "Click a photo to compare"
              : "Click another photo for side-by-side"}
          </p>
        </div>
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No photos yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload your first transformation shot — you'll be glad you did.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => {
              const isSelected =
                p.id === compareLeftId || p.id === compareRightId;
              return (
                <div
                  key={p.id}
                  data-testid={`progress-photo-${p.id}`}
                  className={
                    "group relative overflow-hidden rounded-xl border transition " +
                    (isSelected
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border")
                  }
                >
                  <button
                    onClick={() => handleCompareSelect(p.id)}
                    className="block w-full text-left"
                  >
                    <img
                      src={p.imageUrl}
                      alt={`Progress ${new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`}
                      className="aspect-square w-full object-cover transition group-hover:opacity-90"
                    />
                    <div className="p-2">
                      <p className="text-xs font-medium">
                        {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {p.notes && (
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this photo?")) {
                        deletePhoto.mutate({ id: p.id });
                        if (p.id === compareLeftId) setCompareLeftId(null);
                        if (p.id === compareRightId) setCompareRightId(null);
                      }
                    }}
                    aria-label="Delete photo"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
