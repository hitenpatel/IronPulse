import { notFound } from "next/navigation";
import { db } from "@ironpulse/db";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ id: string }>;
}

async function getCoachProfile(userId: string) {
  const profile = await db.coachProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
  return profile;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getCoachProfile(id);

  if (!profile || !profile.isPublic) {
    return { title: "Coach Not Found" };
  }

  const title = `${profile.user.name ?? "Coach"} | IronPulse Coach`;
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `${profile.user.name ?? "Coach"} on IronPulse`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(profile.imageUrl && {
        images: [{ url: profile.imageUrl }],
      }),
    },
  };
}

export default async function PublicCoachProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getCoachProfile(id);

  if (!profile || !profile.isPublic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          {profile.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt={profile.user.name ?? "Coach"}
              className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-border">
              <span className="text-3xl font-bold text-primary">
                {profile.user.name?.[0]?.toUpperCase() ?? "C"}
              </span>
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold">
              {profile.user.name ?? "Coach"}
            </h1>
            <p className="text-sm text-muted-foreground">IronPulse Coach</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Specialties */}
        {profile.specialties.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Specialties
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Coach profile on IronPulse
        </div>
      </div>
    </div>
  );
}
