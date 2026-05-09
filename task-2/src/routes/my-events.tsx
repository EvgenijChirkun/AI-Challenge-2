import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ExternalLink, Pencil, ScanLine, Search, Users, Download } from "lucide-react";
import { toast } from "sonner";
import { useEventCounts } from "@/lib/event-counts";
import { loadEventRsvpExport, buildRsvpCsv, downloadCsv } from "@/lib/csv";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/my-events")({
  head: () => ({ meta: [{ title: "My events — Gather" }] }),
  component: MyEvents,
});

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  slug: string;
  start_at: string;
  end_at: string;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
  capacity: number;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MyEvents() {
  const { user, memberships, loading } = useAuth();
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const hostIds = memberships.map((m) => m.host_id);

  const { data: events, isLoading } = useQuery({
    queryKey: ["my-events", hostIds.join(",")],
    enabled: !!user && hostIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, host_id, title, slug, start_at, end_at, status, visibility, capacity")
        .in("host_id", hostIds)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const hostById = useMemo(() => {
    const map: Record<string, { name: string; role: "host" | "checker" }> = {};
    for (const m of memberships) {
      if (m.host) map[m.host_id] = { name: m.host.name, role: m.role };
    }
    return map;
  }, [memberships]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 24 * 3600 * 1000 : null;
    return (events ?? []).filter((e) => {
      if (hostFilter !== "all" && e.host_id !== hostFilter) return false;
      const start = new Date(e.start_at).getTime();
      if (fromTs !== null && start < fromTs) return false;
      if (toTs !== null && start > toTs) return false;
      if (q) {
        const hostName = hostById[e.host_id]?.name?.toLowerCase() ?? "";
        if (!e.title.toLowerCase().includes(q) && !hostName.includes(q)) return false;
      }
      return true;
    });
  }, [events, hostFilter, from, to, search, hostById]);

  if (loading) return <div className="container-page py-10 text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Users}
          title="Sign in to see your events"
          description="My events shows events you're assigned to as Host or Checker."
          action={
            <Button asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (hostIds.length === 0) {
    return (
      <div className="container-page py-10">
        <PageHeader eyebrow="My events" title="My events" />
        <div className="mt-6">
          <EmptyState
            icon={Calendar}
            title="You are not assigned to any host events yet."
            description="Accept a host invite link or register your own host to get started."
            action={
              <Button asChild>
                <Link to="/host/register">Become a host</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="My events"
        title="My events"
        description="Events across hosts where you're a Host or Checker."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or host"
            className="pl-9"
          />
        </div>
        <Select value={hostFilter} onValueChange={setHostFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All hosts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hosts</SelectItem>
            {memberships.map((m) => (
              <SelectItem key={m.host_id} value={m.host_id}>
                {m.host?.name ?? m.host_id} · {m.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events match"
            description="Try changing filters or search."
          />
        ) : (
          filtered.map((e) => {
            const meta = hostById[e.host_id];
            return (
              <MyEventCard
                key={e.id}
                event={e}
                hostName={meta?.name ?? ""}
                role={meta?.role ?? "checker"}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function MyEventCard({
  event: e,
  hostName,
  role,
}: {
  event: EventRow;
  hostName: string;
  role: "host" | "checker";
}) {
  const isHostRole = role === "host";
  const counts = useEventCounts(e.id);
  const [busy, setBusy] = useState(false);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const rows = await loadEventRsvpExport(e.id);
      const csv = buildRsvpCsv(rows);
      downloadCsv(`${e.slug}-rsvps.csv`, csv);
      toast.success(`Exported ${rows.length} RSVP${rows.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{e.title}</h3>
            <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {e.visibility}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase">
              {role}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hostName} · {fmt(e.start_at)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="secondary">Going {counts.data?.going ?? 0}</Badge>
            <Badge variant="secondary">Waitlist {counts.data?.waitlisted ?? 0}</Badge>
            <Badge variant="secondary">
              Checked-in {counts.data?.checkedIn ?? 0}/{e.capacity}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isHostRole && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/events/$eventId" params={{ eventId: e.id }}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
          )}
          {e.status === "published" && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/events/$eventId/check-in" params={{ eventId: e.id }}>
                <ScanLine className="mr-1 h-3.5 w-3.5" /> Check-in
              </Link>
            </Button>
          )}
          {isHostRole && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={busy}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
          {e.status === "published" && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/events/$slug" params={{ slug: e.slug }} target="_blank">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Public
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

