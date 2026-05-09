import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Search, Globe, Users, CalendarSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore events — Gather" },
      { name: "description", content: "Browse free, public community events near you." },
    ],
  }),
  component: ExplorePage,
});

type LocationFilter = "all" | "online" | "venue";

type ExploreEvent = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: "venue" | "online";
  venue_address: string | null;
  capacity: number;
  cover_image_url: string | null;
  host: { id: string; name: string; slug: string } | null;
};

function formatDate(iso: string, tz: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

function ExplorePage() {
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState<LocationFilter>("all");
  const [includePast, setIncludePast] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["explore-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, slug, description, start_at, end_at, timezone, location_type, venue_address, capacity, cover_image_url, host:hosts(id, name, slug)",
        )
        .eq("status", "published")
        .eq("visibility", "public")
        .eq("hidden", false)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const raw = row as unknown as Omit<ExploreEvent, "host"> & {
          host: ExploreEvent["host"] | ExploreEvent["host"][];
        };
        const host = Array.isArray(raw.host) ? (raw.host[0] ?? null) : (raw.host ?? null);
        return { ...raw, host } as ExploreEvent;
      });
    },
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    const startMs = startDate ? new Date(startDate).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

    const list = (data ?? []).filter((e) => {
      const isPast = new Date(e.end_at).getTime() < now;
      if (!includePast && isPast) return false;
      if (location !== "all" && e.location_type !== location) return false;
      if (q) {
        const hay = `${e.title} ${e.description ?? ""} ${e.host?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const startAt = new Date(e.start_at).getTime();
      if (startMs !== null && startAt < startMs) return false;
      if (endMs !== null && startAt > endMs) return false;
      return true;
    });

    // Upcoming first (asc), then past (desc) when included
    const upcoming = list
      .filter((e) => new Date(e.end_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    const past = list
      .filter((e) => new Date(e.end_at).getTime() < now)
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    return [...upcoming, ...past];
  }, [data, query, startDate, endDate, location, includePast]);

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Explore"
        title="Find your next free event"
        description="Browse upcoming community events. Free to attend."
      />

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="q" className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              placeholder="Title, description, or host"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start" className="text-xs">From</Label>
          <Input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end" className="text-xs">To</Label>
          <Input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Location</Label>
          <Select value={location} onValueChange={(v) => setLocation(v as LocationFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              <SelectItem value="venue">In person</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
        <Label htmlFor="past" className="text-sm text-muted-foreground">
          Include past events
        </Label>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading events…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarSearch}
            title="No events match your filters."
            description="Try clearing search, broadening the date range, or toggling Include past events."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <ExploreCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExploreCard({ event }: { event: ExploreEvent }) {
  const isPast = new Date(event.end_at).getTime() < Date.now();
  return (
    <Link to="/events/$slug" params={{ slug: event.slug }} className="group">
      <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-soft)]">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt=""
            className="h-36 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-36 w-full bg-gradient-to-br from-secondary to-muted" />
        )}
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="rounded-full">Free</Badge>
            <Badge variant="outline" className="rounded-full">
              {event.location_type === "online" ? (
                <><Globe className="mr-1 h-3 w-3" /> Online</>
              ) : (
                <><MapPin className="mr-1 h-3 w-3" /> In person</>
              )}
            </Badge>
            {isPast && <Badge variant="destructive" className="rounded-full">Ended</Badge>}
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold group-hover:text-primary">
            {event.title}
          </h3>
          {event.host && (
            <p className="mt-1 text-sm text-muted-foreground">by {event.host.name}</p>
          )}
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> {formatDate(event.start_at, event.timezone)}
            </div>
            {event.location_type === "venue" && event.venue_address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {event.venue_address}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Capacity {event.capacity}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
