"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ClipboardList,
  MessageSquare,
  Crown,
  Pencil,
  Check,
  ExternalLink,
  Upload,
} from "lucide-react";

const S3_PUBLIC_URL = process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "http://localhost:9000/ironpulse";

export default function CoachDashboardPage() {
  const { data, isLoading } = trpc.user.me.useQuery();

  const user = data?.user;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.tier !== "coach") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Crown className="mx-auto h-12 w-12 text-pr-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Coach Dashboard</h1>
          <p className="text-muted-foreground">
            Upgrade to the Coach tier to manage clients, build programs, and
            communicate with athletes.
          </p>
          <Button asChild>
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <CoachOverview />;
}

function CoachOverview() {
  const { data: clients } = trpc.coach.clients.useQuery();
  const { data: programs } = trpc.program.list.useQuery();

  const clientCount = clients?.length ?? 0;
  const programCount = programs?.length ?? 0;

  const cards = [
    {
      title: "Clients",
      value: clientCount,
      description: "Active athletes",
      icon: Users,
      href: "/coach/clients",
    },
    {
      title: "Programs",
      value: programCount,
      description: "Training programs",
      icon: ClipboardList,
      href: "/coach/programs",
    },
    {
      title: "Messages",
      value: null,
      description: "Coach-athlete chat",
      icon: MessageSquare,
      href: "/messages",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Coach Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div className="bg-card rounded-lg border border-border p-5 transition-colors hover:bg-muted/30 cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </span>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {card.value !== null && (
                <p className="font-display font-bold text-[32px] text-foreground leading-none mb-1">
                  {card.value}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <EditCoachProfile />
    </div>
  );
}

function EditCoachProfile() {
  const utils = trpc.useUtils();
  const { data: userData } = trpc.user.me.useQuery();
  const { data: profile, isLoading } = trpc.coach.profile.useQuery();
  const updateProfile = trpc.coach.updateProfile.useMutation({
    onSuccess: () => {
      utils.coach.profile.invalidate();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
  });

  const pendingFile = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const uploadProfileImage = trpc.coach.uploadProfileImage.useMutation({
    onSuccess: async ({ uploadUrl, imageKey }, { contentType }) => {
      if (!pendingFile.current) return;
      await fetch(uploadUrl, {
        method: "PUT",
        body: pendingFile.current,
        headers: { "Content-Type": contentType },
      });
      pendingFile.current = null;
      setImageUploading(false);
      updateProfile.mutate({ imageUrl: imageKey });
    },
    onError: () => {
      pendingFile.current = null;
      setImageUploading(false);
    },
  });

  const [bio, setBio] = useState("");
  const [specialtiesInput, setSpecialtiesInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      setSpecialtiesInput((profile.specialties ?? []).join(", "));
      setImageUrl(profile.imageUrl ?? "");
      setIsPublic(profile.isPublic);
    }
  }, [profile]);

  function handleSave() {
    setSaveStatus("saving");
    const specialties = specialtiesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateProfile.mutate({
      bio: bio.trim() || undefined,
      specialties,
      imageUrl: imageUrl || undefined,
      isPublic,
    });
  }

  function handleImageClick() {
    fileInputRef.current?.click();
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"] as const;
    type AllowedType = (typeof allowedTypes)[number];
    if (!allowedTypes.includes(file.type as AllowedType)) return;
    pendingFile.current = file;
    setImageUploading(true);
    uploadProfileImage.mutate({ contentType: file.type as AllowedType });
    e.target.value = "";
  }

  const imageDisplayUrl = imageUrl ? `${S3_PUBLIC_URL}/${imageUrl}` : undefined;

  if (isLoading) {
    return <div className="h-[200px] animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Pencil className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-base text-foreground">Coach Profile</h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="coach-bio">Bio</Label>
          <textarea
            id="coach-bio"
            className="flex w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[80px] resize-y"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell athletes about yourself..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="coach-specialties">
            Specialties (comma-separated)
          </Label>
          <Input
            id="coach-specialties"
            value={specialtiesInput}
            onChange={(e) => setSpecialtiesInput(e.target.value)}
            placeholder="e.g. Powerlifting, Hypertrophy, Running"
          />
          {specialtiesInput && (
            <div className="flex flex-wrap gap-1 mt-1">
              {specialtiesInput
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Profile Image</Label>
          <div className="flex items-center gap-4">
            {imageDisplayUrl && (
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
                <Image
                  src={imageDisplayUrl}
                  alt="Coach profile image"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImageClick}
              disabled={imageUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {imageUploading
                ? "Uploading..."
                : imageDisplayUrl
                ? "Change Image"
                : "Upload Image"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Public Profile</Label>
            <p className="text-xs text-muted-foreground">
              Allow anyone to view your coach profile
            </p>
          </div>
          <Button
            variant={isPublic ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPublic(!isPublic)}
          >
            {isPublic ? "Public" : "Private"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending || imageUploading}
          >
            {saveStatus === "saved" ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : saveStatus === "saving" ? (
              "Saving..."
            ) : (
              "Save Profile"
            )}
          </Button>

          {isPublic && userData?.user?.id && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/coach/${userData.user.id}`}
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                View Public Profile
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
