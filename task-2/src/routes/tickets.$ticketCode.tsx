import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Globe, CalendarPlus, Ticket as TicketIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeImage } from "@/components/qr-code";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { cancelRsvp, type Rsvp } from "@/lib/rsvp";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type TicketRow = Rsvp & {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    start_at: string;
    end_at: string;
    timezone: string;
    location_type: "venue" | "online";
    venue_address: string | null;
    online_link: string | null;
    host: { name: string; slug: string } | null;
  } | null;
};

async function loadTicketByCode(code: string): Promise<TicketRow | null> {
  const { data, error } = await supabase
    .from("rsvps")
    .select(
      "id, event_id, user_id, status, ticket_code, qr_payload, waitlist_position, promoted_at, canceled_at, created_at, event:events(id, title, slug, description, start_at, end_at, timezone, location_type, venue_address, online_link, host:hosts(name, slug))",
    )
    .eq("ticket_code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as unknown as TicketRow & {
    event: (TicketRow["event"] & { host: { name: string; slug: string } | { name: string; slug: string }[] | null }) | null;
  };
  if (raw.event && Array.isArray(raw.event.host)) {
    raw.event.host = raw.event.host[0] ?? null;
  }
  return raw as TicketRow;
}

export const Route = createFileRoute("/tickets/$ticketCode")({
  head: () => ({ meta: [{ title: "Ticket — Gather" }] }),
  loader: async ({ params }) => {
    const ticket = await loadTicketByCode(params.ticketCode);
    if (!ticket) throw notFound();
    return { ticket };
  },
  component: TicketDetail,
});

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

function TicketDetail() {
  const { ticket: initial } = Route.useLoaderData();
  const { user, fullName, email } = useAuth();
  const qc = useQueryClient();

  const { data: ticket } = useQuery({
    queryKey: ["ticket", initial.ticket_code],
    queryFn: () => loadTicketByCode(initial.ticket_code),
    initialData: initial,
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!ticket) throw new Error("Missing ticket");
      return cancelRsvp(ticket.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", initial.ticket_code] });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast.success("RSVP canceled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!ticket || !ticket.event) {
    return (
      <div className="container-page py-10">
        <PageHeader title="Ticket not found" description="This ticket doesn't exist." />
      </div>
    );
  }

  const e = ticket.event;
  const hasEnded = new Date(e.end_at).getTime() < Date.now();
  const isOwner = !!user && ticket.user_id === user.id;

  const handleAddToCalendar = () => {
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
      <PageHeader eyebrow="Ticket" title={e.title} description={e.host ? `Hosted by ${e.host.name}` : undefined} />

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={ticket.status === "going" ? "default" : ticket.status === "waitlisted" ? "secondary" : "outline"}
                className="rounded-full"
              >
                {ticket.status === "going" && "Going"}
                {ticket.status === "waitlisted" && `Waitlisted #${ticket.waitlist_position ?? ""}`}
                {ticket.status === "canceled" && "Canceled"}
              </Badge>
              {hasEnded && <Badge variant="outline">Ended</Badge>}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatRange(e.start_at, e.end_at, e.timezone)}
              </div>
              {e.location_type === "venue" && e.venue_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {e.venue_address}
                </div>
              )}
              {e.location_type === "online" && e.online_link && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={e.online_link} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                    Online link
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border bg-surface/40 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Attendee</p>
              <p>{fullName || email || "—"}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Ticket code</p>
              <p className="font-mono text-sm tracking-wider">{ticket.ticket_code}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleAddToCalendar}>
                <CalendarPlus className="mr-1 h-4 w-4" /> Add to calendar
              </Button>
              <Button asChild variant="outline">
                <Link to="/events/$slug" params={{ slug: e.slug }}>
                  <TicketIcon className="mr-1 h-4 w-4" /> Event page
                </Link>
              </Button>
              {isOwner && !hasEnded && ticket.status !== "canceled" && (
                <Button
                  variant="ghost"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? "Canceling…" : "Cancel RSVP"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid place-items-center gap-3 p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">QR code</p>
            {ticket.status === "going" ? (
              <QRCodeImage value={ticket.qr_payload} size={208} />
            ) : (
              <div className="grid h-52 w-52 place-items-center rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
                {ticket.status === "waitlisted"
                  ? "QR shown when promoted from waitlist"
                  : "RSVP canceled"}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">Show this QR at the door for check-in.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
