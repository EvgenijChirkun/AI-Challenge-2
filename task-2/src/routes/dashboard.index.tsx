import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ExternalLink,
  Mail,
  Calendar,
  Users,
  Pencil,
  Eye,
  EyeOff,
  Copy,
  ScanLine,
  Download,
  Shield,
} from "lucide-react";
import { useEventCounts } from "@/lib/event-counts";
import { loadEventRsvpExport, buildRsvpCsv, downloadCsv } from "@/lib/csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify, randomSuffix } from "@/lib/slug";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Host dashboard — Gather" }] }),
  component: Dashboard,
});

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  slug: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
  capacity: number;
  cover_image_url: string | null;
  location_type: "venue" | "online";
  venue_address: string | null;
  online_link: string | null;
  timezone: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const { user, isHost, memberships, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const hostMemberships = useMemo(
    () => memberships.filter((m) => m.role === "host" && m.host),
    [memberships],
  );

  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const activeHostId = selectedHostId ?? hostMemberships[0]?.host_id ?? null;

  const { data: hostDetails } = useQuery({
    queryKey: ["host", activeHostId],
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hosts")
        .select("id, name, slug, bio, contact_email, logo_url")
        .eq("id", activeHostId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["host-events", activeHostId],
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, host_id, title, slug, description, start_at, end_at, status, visibility, capacity, cover_image_url, location_type, venue_address, online_link, timezone",
        )
        .eq("host_id", activeHostId!)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  if (authLoading) {
    return <div className="container-page py-10 text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Users}
          title="Sign in to access the dashboard"
          description="The host dashboard is only available to signed-in host members."
          action={
            <Button asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Users}
          title="You're not a host yet"
          description="Register a host profile to start publishing events on Gather."
          action={
            <Button asChild>
              <Link to="/host/register">Become a host</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const now = Date.now();
  const upcoming = (events ?? []).filter((e) => new Date(e.start_at).getTime() >= now);
  const past = (events ?? []).filter((e) => new Date(e.start_at).getTime() < now);
  const goToNewEvent = () => {
    void navigate({ to: "/dashboard/events/new" });
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Host dashboard"
        title={hostDetails?.name ?? "Host dashboard"}
        description="Manage your events, attendees, and host profile."
        actions={
          <>
            {hostDetails?.slug && (
              <Button asChild variant="outline">
                <Link to="/host/$slug" params={{ slug: hostDetails.slug }}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Public page
                </Link>
              </Button>
            )}
            {activeHostId && (
              <Button asChild variant="outline">
                <Link to="/hosts/$hostId/invites" params={{ hostId: activeHostId }}>
                  <Mail className="mr-1 h-4 w-4" /> Invite members
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/dashboard/reviews">
                <Shield className="mr-1 h-4 w-4" /> Review queue
              </Link>
            </Button>
            <Button type="button" onClick={goToNewEvent}>
              <Plus className="mr-1 h-4 w-4" /> New event
            </Button>
          </>
        }
      />

      {hostMemberships.length > 1 && (
        <div className="mt-6 max-w-sm">
          <Select value={activeHostId ?? undefined} onValueChange={(v) => setSelectedHostId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Switch host" />
            </SelectTrigger>
            <SelectContent>
              {hostMemberships.map((m) => (
                <SelectItem key={m.host_id} value={m.host_id}>
                  {m.host?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hostDetails && (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <Avatar className="h-16 w-16">
              {hostDetails.logo_url ? <AvatarImage src={hostDetails.logo_url} alt="" /> : null}
              <AvatarFallback>{hostDetails.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold">{hostDetails.name}</h2>
              {hostDetails.bio && (
                <p className="mt-1 text-sm text-muted-foreground">{hostDetails.bio}</p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {hostDetails.contact_email}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-8">
        <EventSection
          title="Upcoming events"
          empty="No upcoming events yet"
          emptyDescription="Create your first event to start collecting RSVPs."
          events={upcoming}
          loading={eventsLoading}
        />
        <EventSection
          title="Past events"
          empty="No past events yet"
          emptyDescription="Past events will appear here after they end."
          events={past}
          loading={eventsLoading}
        />
      </div>
    </div>
  );
}

function EventSection({
  title,
  empty,
  emptyDescription,
  events,
  loading,
}: {
  title: string;
  empty: string;
  emptyDescription: string;
  events: EventRow[];
  loading: boolean;
}) {
  return (
    <section>
      <h3 className="mb-3 font-display text-lg font-semibold">{title}</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <EmptyState icon={Calendar} title={empty} description={emptyDescription} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const togglePublish = async () => {
    setBusy(true);
    try {
      const next = event.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("events")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", event.id);
      if (error) throw error;
      toast.success(next === "published" ? "Event published" : "Event unpublished");
      qc.invalidateQueries({ queryKey: ["host-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const newSlug = `${slugify(event.slug)}-${randomSuffix()}`.slice(0, 80);
      const { data: ins, error } = await supabase
        .from("events")
        .insert({
          host_id: event.host_id,
          title: `${event.title} Copy`,
          slug: newSlug,
          description: event.description,
          start_at: event.start_at,
          end_at: event.end_at,
          timezone: event.timezone,
          location_type: event.location_type,
          venue_address: event.venue_address,
          online_link: event.online_link,
          capacity: event.capacity,
          visibility: event.visibility,
          status: "draft",
          cover_image_url: event.cover_image_url,
          is_paid: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Event duplicated");
      qc.invalidateQueries({ queryKey: ["host-events"] });
      navigate({ to: "/dashboard/events/$eventId", params: { eventId: ins.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate");
    } finally {
      setBusy(false);
    }
  };

  const counts = useEventCounts(event.id);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const rows = await loadEventRsvpExport(event.id);
      const csv = buildRsvpCsv(rows);
      downloadCsv(`${event.slug}-rsvps.csv`, csv);
      toast.success(`Exported ${rows.length} RSVP${rows.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{event.title}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={event.status === "published" ? "default" : "secondary"}>
              {event.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {event.visibility}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(event.start_at)} · cap {event.capacity}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <Badge variant="secondary">Going {counts.data?.going ?? 0}</Badge>
          <Badge variant="secondary">Waitlist {counts.data?.waitlisted ?? 0}</Badge>
          <Badge variant="secondary">
            Checked-in {counts.data?.checkedIn ?? 0}/{event.capacity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard/events/$eventId" params={{ eventId: event.id }}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={togglePublish} disabled={busy}>
          {event.status === "published" ? (
            <>
              <EyeOff className="mr-1 h-3.5 w-3.5" /> Unpublish
            </>
          ) : (
            <>
              <Eye className="mr-1 h-3.5 w-3.5" /> Publish
            </>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={duplicate} disabled={busy}>
          <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={busy}>
          <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
        </Button>
        {event.status === "published" && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/events/$eventId/check-in" params={{ eventId: event.id }}>
                <ScanLine className="mr-1 h-3.5 w-3.5" /> Check-in
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/events/$slug" params={{ slug: event.slug }} target="_blank">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Public
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

