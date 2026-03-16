"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function CoachDashboardPage() {
  const { data, isLoading } = trpc.user.me.useQuery();

  const user = data?.user;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.tier !== "coach") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Crown className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold">Coach Dashboard</h1>
          <p className="text-muted-foreground">
            Upgrade to the Coach tier to manage clients, build programs, and
            communicate with athletes.
          </p>
          <Button asChild>
            <Link href="/settings/integrations">View Pricing</Link>
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
      <h1 className="text-2xl font-bold">Coach Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {card.value !== null && (
                  <p className="text-2xl font-bold">{card.value}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
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
      imageUrl: imageUrl.trim() || undefined,
      isPublic,
    });
  }

  if (isLoading) {
    return <div className="h-[200px] animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pencil className="h-4 w-4" />
          Coach Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="coach-bio">Bio</Label>
          <textarea
            id="coach-bio"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y"
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
          <Label htmlFor="coach-image">Profile Image URL</Label>
          <Input
            id="coach-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
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
            disabled={updateProfile.isPending}
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
      </CardContent>
    </Card>
  );
}
