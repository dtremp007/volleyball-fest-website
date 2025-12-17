import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useTRPC } from "~/trpc/react";

const teamSearchSchema = z.object({
  playerId: z.string().optional(),
});

export const Route = createFileRoute("/(authenticated)/teams/$teamId")({
  component: TeamDetailPage,
  validateSearch: teamSearchSchema,
});

function TeamDetailPage() {
  const { teamId } = Route.useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/teams">
            <ArrowLeft className="size-4" />
            Back to Teams
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TeamDetailSkeleton />}>
        <TeamDetail teamId={teamId} />
      </Suspense>
    </div>
  );
}

function TeamDetail({ teamId }: { teamId: string }) {
  const trpc = useTRPC();
  const { data: team } = useSuspenseQuery(trpc.team.getById.queryOptions({ id: teamId }));

  if (!team) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Team not found</h2>
        <p className="text-muted-foreground mt-2">
          The team you're looking for doesn't exist.
        </p>
        <Button asChild className="mt-4">
          <Link to="/teams">Back to Teams</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Avatar className="size-24">
          {team.logoUrl && <AvatarImage src={team.logoUrl} alt={`${team.name} logo`} />}
          <AvatarFallback className="text-2xl font-bold">
            {team.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
              {team.category}
            </span>
            <span className="text-muted-foreground">{team.season}</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Captain</h2>
          <div className="space-y-2">
            <div>
              <p className="text-muted-foreground text-sm">Name</p>
              <p className="font-medium">{team.captainName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Phone</p>
              <p className="font-medium">{team.captainPhone}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Co-Captain</h2>
          <div className="space-y-2">
            <div>
              <p className="text-muted-foreground text-sm">Name</p>
              <p className="font-medium">{team.coCaptainName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Phone</p>
              <p className="font-medium">{team.coCaptainPhone}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Location</h2>
          <div>
            <p className="text-muted-foreground text-sm">Coming From</p>
            <p className="font-medium">{team.comingFrom}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Unavailable Dates</h2>
          <p className="font-medium">
            {team.unavailableDates || "No unavailable dates specified"}
          </p>
        </div>
      </div>

      {/* Players Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <h2 className="text-xl font-semibold">
            Roster ({team.players?.length || 0} players)
          </h2>
        </div>

        {team.players && team.players.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Jersey #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <span className="bg-primary/10 text-primary inline-flex size-8 items-center justify-center rounded-full text-sm font-bold">
                        {player.jerseyNumber}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>
                      <span className="bg-muted inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {player.position || "Unknown"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">No players registered yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Skeleton className="size-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-[200px]" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-[80px] rounded-full" />
            <Skeleton className="h-5 w-[100px]" />
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-[100px]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-5 w-[150px]" />
            </div>
          </div>
        ))}
      </div>

      {/* Players Section */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-[180px]" />
        <div className="rounded-lg border">
          <div className="space-y-4 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-5 w-[100px] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
