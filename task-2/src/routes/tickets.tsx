import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CalendarDays, MapPin, Ticket as TicketIcon, Globe, CalendarPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cancelRsvp, type Rsvp } from "@/lib/rsvp";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "My tickets — Gather" }] }),
  component: MyTickets,
});

type MyTicket = Rsvp & {
  event: {
    id: string;
    title: string;
    slug: string;
    start_at: string;
    end_at: string;
    timezone: string;
    location_type: "venue" | "online";
    venue_address: string | null;
    online_link: string | null;
    description: string | null;
    host: { name: string; slug: string } | null;
  } | null;
};

async function loadMyTickets(userId: string): Promise<MyTicket[]> {
  const { data, error } = await supabase
    .from("rsvps")
    .select(
      "id, event_id, user_id, status, ticket_code, qr_payload, waitlist_position, promoted_at, canceled_at, created_at, event:events(id, title, slug, start_at, end_at, timezone, location_type, venue_address, online_link, description, host:hosts(name, slug))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as MyTicket & {
      event: (MyTicket["event"] & {
        host: { name: string; slug: string } | { name: string; slug: string }[] | null;
      }) | null;
    };
    if (r.event && Array.isArray(r.event.host)) r.event.host = r.event.host[0] ?? null;
    return r as MyTicket;
  });
}

function formatRange(startIso: string, endIso: string, tz: string) {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  };
  return `${new Date(startIso).toLocaleString(undefined, opts)} → ${new Date(endIso).toLocaleString(undefined, opts)} (${tz})`;
}

function MyTickets() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/signin", search: { redirect: "/tickets" } });
    }
  }, [loading, user, navigate]);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: () => (user ? loadMyTickets(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (rsvpId: string) => cancelRsvp(rsvpId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast.success("RSVP canceled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = Date.now();
  const upcoming = (tickets ?? []).filter(
    (t) => t.event && t.status !== "canceled" && new Date(t.event.end_at).getTime() >= now,
  );
  const past = (tickets ?? []).filter(
    (t) => t.event && t.status !== "canceled" && new Date(t.event.end_at).getTime() < now,
  );
  const canceled = (tickets ?? []).filter((t) => t.status === "canceled");

  const handleAddToCalendar = (t: MyTicket) => {
    if (!t.event) return;
    const e = t.event;
    const ics = buildIcs({
      uid: `gather-${e.id}@gather.app`,
      title: e.title,
      description: e.description ?? undefined,
      startIso: e.start_at,
      endIso: e.end_at,
      location: e.location_type === "venue" ? e.venue_address ?? undefined : e.online_link ?? undefined,
      url: typeof window !== "undefined" ? `${window.location.origin}/events/${e.slug}` : undefined,
    });
    downloadIcs(`${e.slug}.ics`, ics);
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Attendee"
        title="My tickets"
        description="Your digital tickets for upcoming events. Show the QR code at the door for check-in."
      />

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : upcoming.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={TicketIcon}
            title="No upcoming tickets"
            description="RSVP to a free event to receive your first digital ticket."
            action={
              <Button asChild>
                <Link to="/explore">Explore events</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {upcoming.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onCancel={() => cancelMutation.mutate(t.id)}
              onAddToCalendar={() => handleAddToCalendar(t)}
              canceling={cancelMutation.isPending}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-lg font-semibold text-muted-foreground">Past</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {past.map((t) => (
              <TicketCard key={t.id} ticket={t} past />
            ))}
          </div>
        </div>
      )}

      {canceled.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-lg font-semibold text-muted-foreground">Canceled</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {canceled.map((t) => (
              <TicketCard key={t.id} ticket={t} past />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  onCancel,
  onAddToCalendar,
  canceling,
  past,
}: {
  ticket: MyTicket;
  onCancel?: () => void;
  onAddToCalendar?: () => void;
  canceling?: boolean;
  past?: boolean;
}) {
  const e = ticket.event;
  if (!e) return null;
  const isGoing = ticket.status === "going";
  const isWaitlisted = ticket.status === "waitlisted";

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={isGoing ? "default" : isWaitlisted ? "secondary" : "outline"}
            className="rounded-full"
          >
            {ticket.status === "going" && "Going"}
            {ticket.status === "waitlisted" && `Waitlisted #${ticket.waitlist_position ?? ""}`}
            {ticket.status === "canceled" && "Canceled"}
          </Badge>
          {past && <Badge variant="outline">Past</Badge>}
        </div>
        <h3 className="font-display text-xl font-semibold">{e.title}</h3>
        {e.host && <p className="text-sm text-muted-foreground">Hosted by {e.host.name}</p>}
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> {formatRange(e.start_at, e.end_at, e.timezone)}
          </div>
          {e.location_type === "venue" && e.venue_address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {e.venue_address}
            </div>
          )}
          {e.location_type === "online" && e.online_link && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> Online
            </div>
          )}
        </div>
        {isGoing && (
          <p className="font-mono text-xs tracking-wider text-muted-foreground">{ticket.ticket_code}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {isGoing && (
            <Button asChild size="sm" variant="outline">
              <Link to="/tickets/$ticketCode" params={{ ticketCode: ticket.ticket_code }}>
                View ticket
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to="/events/$slug" params={{ slug: e.slug }}>
              Event page
            </Link>
          </Button>
          {isGoing && onAddToCalendar && (
            <Button size="sm" variant="outline" onClick={onAddToCalendar}>
              <CalendarPlus className="mr-1 h-4 w-4" /> Calendar
            </Button>
          )}
          {!past && onCancel && ticket.status !== "canceled" && (
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={canceling}>
              {canceling ? "Canceling…" : "Cancel RSVP"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
