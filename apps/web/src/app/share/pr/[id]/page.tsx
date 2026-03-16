import { notFound } from "next/navigation";
import { db } from "@ironpulse/db";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPersonalRecord(id: string) {
  const pr = await db.personalRecord.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      exercise: { select: { name: true } },
    },
  });
  return pr;
}

function formatPrType(type: string): string {
  switch (type) {
    case "one_rep_max":
      return "1RM";
    case "max_weight":
      return "Max Weight";
    case "max_reps":
      return "Max Reps";
    case "max_volume":
      return "Max Volume";
    default:
      return type;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pr = await getPersonalRecord(id);
  if (!pr) return { title: "PR Not Found" };

  const title = `New PR! ${pr.exercise.name} — ${Number(pr.value)}kg ${formatPrType(pr.type)} | IronPulse`;
  const description = `${pr.user.name ?? "Someone"} hit a new personal record on ${pr.exercise.name}!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function SharePrPage({ params }: Props) {
  const { id } = await params;
  const pr = await getPersonalRecord(id);

  if (!pr) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
          {/* Trophy icon */}
          <div className="text-6xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-yellow-400"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>

          {/* PR Info */}
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
              New Personal Record!
            </p>
            <h1 className="text-3xl font-bold">{pr.exercise.name}</h1>
            <p className="text-5xl font-bold mt-4 text-primary">
              {Number(pr.value)}
              <span className="text-2xl text-muted-foreground ml-1">kg</span>
            </p>
            <p className="text-lg text-muted-foreground mt-2">
              {formatPrType(pr.type)}
            </p>
          </div>

          {/* Meta */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>by {pr.user.name ?? "Someone"}</p>
            <p>
              {new Date(pr.achievedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Shared from IronPulse
        </div>
      </div>
    </div>
  );
}
