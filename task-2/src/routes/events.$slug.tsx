import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Users, Globe, Pencil, CalendarPlus, Ticket as TicketIcon, Star, Upload, Flag, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/layout/page";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { rsvpForEvent, cancelRsvp, getMyRsvpForEvent, type Rsvp } from "@/lib/rsvp";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { getEventFeedbackSummary, submitEventFeedback, getMyFeedback } from "@/lib/feedback";
import { getApprovedEventPhotos, uploadEventPhoto } from "@/lib/gallery";
import { submitReport } from "@/lib/reports";

import { toast } from "sonner";

type PublicEvent = {
  id: string;
  host_id: string;
  title: string;
  slug: string;
  description: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: "venue" | "online";
  venue_address: string | null;
  online_link: string | null;
  capacity: number;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
  hidden: boolean;
  cover_image_url: string | null;
  host: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
};

async function loadEventBySlug(slug: string): Promise<PublicEvent | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, host_id, title, slug, description, start_at, end_at, timezone, location_type, venue_address, online_link, capacity, status, visibility, hidden, cover_image_url, host:hosts(id, name, slug, logo_url)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as unknown as Omit<PublicEvent, "host"> & {
    host: PublicEvent["host"] | PublicEvent["host"][];
  };
  const host = Array.isArray(raw.host) ? (raw.host[0] ?? null) : (raw.host ?? null);
  return { ...raw, host } as PublicEvent;
}

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    const event = await loadEventBySlug(params.slug);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [{ title: "Event — Gather" }] };
    const desc = (e.description ?? "").slice(0, 160) || `${e.title} on Gather`;
    const meta: Array<Record<string, string>> = [
      { title: `${e.title} — Gather` },
      { name: "description", content: desc },
      { property: "og:title", content: e.title },
      { property: "og:description", content: desc },
    ];
    if (e.cover_image_url) {
      meta.push({ property: "og:image", content: e.cover_image_url });
      meta.push({ name: "twitter:image", content: e.cover_image_url });
    }
    return { meta };
  },
  component: PublicEventPage,
});

function formatRange(startIso: string, endIso: string, tz: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  };
  return `${start.toLocaleString(undefined, opts)} → ${end.toLocaleString(undefined, opts)} (${tz})`;
}

function PublicEventPage() {
  const { event: initial } = Route.useLoaderData();
  const { user, fullName, email, memberships } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Refresh from cache to allow live edits in the same session
  const { data: event } = useQuery({
    queryKey: ["public-event", initial.slug],
    queryFn: () => loadEventBySlug(initial.slug),
    initialData: initial,
  });

  if (!event) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Globe}
          title="Event not found"
          description="The event you're looking for doesn't exist or is no longer available."
        />
      </div>
    );
  }

  const isHostMember = memberships.some((m) => m.host_id === event.host_id);
  const isPublished = event.status === "published" && !event.hidden;
  const canView = isPublished || isHostMember;

  if (!canView) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Globe}
          title="Event not available"
          description="This event hasn't been published yet."
          action={
            !user ? (
              <Button asChild>
                <Link to="/signin">Sign in</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const hasEnded = new Date(event.end_at).getTime() < Date.now();

  return (
    <div>
      {event.cover_image_url && (
        <div className="border-b border-border">
          <img
            src={event.cover_image_url}
            alt=""
            className="mx-auto h-48 w-full max-w-5xl object-cover sm:h-64"
          />
        </div>
      )}

      <div className="border-b border-border bg-surface/50">
        <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                Free event
              </Badge>
              {event.status === "draft" && (
                <Badge variant="outline">Draft preview</Badge>
              )}
              {event.visibility === "unlisted" && (
                <Badge variant="outline">Unlisted</Badge>
              )}
              {hasEnded && <Badge variant="destructive">Ended</Badge>}
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              {event.title}
            </h1>
            {event.host && (
              <p className="mt-2 text-muted-foreground">
                Hosted by{" "}
                <Link
                  to="/host/$slug"
                  params={{ slug: event.host.slug }}
                  className="text-primary hover:underline"
                >
                  {event.host.name}
                </Link>
              </p>
            )}

            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatRange(event.start_at, event.end_at, event.timezone)}
              </div>
              {event.location_type === "venue" && event.venue_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {event.venue_address}
                </div>
              )}
              {event.location_type === "online" && event.online_link && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={event.online_link}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Online link
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> Capacity {event.capacity}
              </div>
            </div>
          </div>

          <RsvpCard
            event={event}
            userId={user?.id ?? null}
            fullName={fullName}
            email={email}
            isHostMember={isHostMember}
            hasEnded={hasEnded}
            onRsvpChange={() =>
              qc.invalidateQueries({ queryKey: ["my-rsvp", event.id] })
            }
            onSignInRedirect={() =>
              navigate({
                to: "/signin",
                search: { redirect: `/events/${event.slug}` },
              })
            }
          />
        </div>
      </div>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-2xl font-semibold">About this event</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">
              {event.description?.trim() || "No description yet."}
            </p>
          </section>

          <Separator />

          <FeedbackSection
            eventId={event.id}
            hasEnded={hasEnded}
            userId={user?.id ?? null}
            onSignInRedirect={() =>
              navigate({ to: "/signin", search: { redirect: `/events/${event.slug}` } })
            }
          />

          <Separator />

          <GallerySection
            eventId={event.id}
            userId={user?.id ?? null}
            onSignInRedirect={() =>
              navigate({ to: "/signin", search: { redirect: `/events/${event.slug}` } })
            }
          />
        </div>

        <aside className="space-y-4">
          {event.host && (
            <Card>
              <CardContent className="space-y-2 p-5">
                <h3 className="font-display text-base font-semibold">About the host</h3>
                <p className="text-sm text-muted-foreground">{event.host.name}</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/host/$slug" params={{ slug: event.host.slug }}>
                    View host page
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-2 p-5">
              <h3 className="font-display text-base font-semibold">Something wrong?</h3>
              <p className="text-sm text-muted-foreground">
                Report this event to the moderation team.
              </p>
              <ReportButton
                targetType="event"
                targetId={event.id}
                userId={user?.id ?? null}
                onSignInRedirect={() =>
                  navigate({ to: "/signin", search: { redirect: `/events/${event.slug}` } })
                }
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type RsvpCardEvent = Pick<
  PublicEvent,
  "id" | "slug" | "title" | "description" | "start_at" | "end_at" | "timezone" | "location_type" | "venue_address" | "online_link"
>;

function RsvpCard({
  event,
  userId,
  fullName,
  email,
  isHostMember,
  hasEnded,
  onRsvpChange,
  onSignInRedirect,
}: {
  event: RsvpCardEvent;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  isHostMember: boolean;
  hasEnded: boolean;
  onRsvpChange: () => void;
  onSignInRedirect: () => void;
}) {
  const qc = useQueryClient();
  const { data: rsvp, isLoading } = useQuery({
    queryKey: ["my-rsvp", event.id, userId],
    queryFn: () => (userId ? getMyRsvpForEvent(event.id, userId) : Promise.resolve(null)),
    enabled: !!userId,
  });

  const rsvpMutation = useMutation({
    mutationFn: () => rsvpForEvent(event.id),
    onSuccess: (data: Rsvp) => {
      qc.setQueryData(["my-rsvp", event.id, userId], data);
      onRsvpChange();
      toast.success(data.status === "going" ? "You're going!" : "You're on the waitlist");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!rsvp) throw new Error("No RSVP to cancel");
      return cancelRsvp(rsvp.id);
    },
    onSuccess: (data: Rsvp) => {
      qc.setQueryData(["my-rsvp", event.id, userId], data);
      onRsvpChange();
      toast.success("RSVP canceled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isActive = rsvp && rsvp.status !== "canceled";

  const handleAddToCalendar = () => {
    const ics = buildIcs({
      uid: `gather-${event.id}@gather.app`,
      title: event.title,
      description: event.description ?? undefined,
      startIso: event.start_at,
      endIso: event.end_at,
      location:
        event.location_type === "venue"
          ? event.venue_address ?? undefined
          : event.online_link ?? undefined,
      url: typeof window !== "undefined" ? `${window.location.origin}/events/${event.slug}` : undefined,
    });
    downloadIcs(`${event.slug}.ics`, ics);
  };

  return (
    <Card className="h-fit shadow-[var(--shadow-soft)]">
      <CardContent className="space-y-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Price</p>
          <p className="font-display text-3xl font-semibold">Free</p>
        </div>

        {hasEnded ? (
          <Button size="lg" disabled className="w-full">
            Ended
          </Button>
        ) : !userId ? (
          <Button size="lg" className="w-full" onClick={onSignInRedirect}>
            Sign in to RSVP
          </Button>
        ) : isLoading ? (
          <Button size="lg" disabled className="w-full">
            Loading…
          </Button>
        ) : isActive && rsvp ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-surface/60 p-3 text-center">
              <Badge
                variant={rsvp.status === "going" ? "default" : "secondary"}
                className="rounded-full"
              >
                {rsvp.status === "going" ? "Going" : `Waitlisted #${rsvp.waitlist_position ?? ""}`}
              </Badge>
              {rsvp.promoted_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Promoted from waitlist — you have a confirmed seat.
                </p>
              )}
              {rsvp.status === "going" && (
                <p className="mt-2 font-mono text-xs tracking-wider">{rsvp.ticket_code}</p>
              )}
            </div>

            {rsvp.status === "going" && (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/tickets/$ticketCode"
                    params={{ ticketCode: rsvp.ticket_code }}
                  >
                    <TicketIcon className="mr-1 h-4 w-4" /> View ticket
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddToCalendar}>
                  <CalendarPlus className="mr-1 h-4 w-4" /> Add to calendar
                </Button>
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Canceling…" : "Cancel RSVP"}
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => rsvpMutation.mutate()}
            disabled={rsvpMutation.isPending}
          >
            {rsvpMutation.isPending ? "Reserving…" : "RSVP — Free"}
          </Button>
        )}

        {isHostMember && (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link to="/dashboard/events/$eventId" params={{ eventId: event.id }}>
              <Pencil className="mr-1 h-4 w-4" /> Edit event
            </Link>
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {fullName || email ? `Ticketed to ${fullName ?? email}` : "Digital tickets are issued instantly after RSVP."}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------- Feedback ----------------

function StarPicker({ value, onChange, readOnly = false, size = 5 }: { value: number; onChange?: (v: number) => void; readOnly?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: size }).map((_, i) => {
        const n = i + 1;
        const filled = n <= value;
        return (
          <button
            type="button"
            key={n}
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={`transition-colors ${readOnly ? "cursor-default" : "hover:text-primary"}`}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star className={`h-5 w-5 ${filled ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        );
      })}
    </div>
  );
}

function FeedbackSection({
  eventId,
  hasEnded,
  userId,
  onSignInRedirect,
}: {
  eventId: string;
  hasEnded: boolean;
  userId: string | null;
  onSignInRedirect: () => void;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["feedback-summary", eventId],
    queryFn: () => getEventFeedbackSummary(eventId),
  });

  const { data: mine } = useQuery({
    queryKey: ["my-feedback", eventId, userId],
    queryFn: () => (userId ? getMyFeedback(eventId, userId) : Promise.resolve(null)),
    enabled: !!userId && hasEnded,
  });

  const submit = useMutation({
    mutationFn: () => submitEventFeedback(eventId, rating, comment),
    onSuccess: () => {
      toast.success("Thanks for your feedback!");
      setComment("");
      qc.invalidateQueries({ queryKey: ["feedback-summary", eventId] });
      qc.invalidateQueries({ queryKey: ["my-feedback", eventId, userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avg = summary?.average ?? null;
  const count = summary?.count ?? 0;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Feedback</h2>
        {count > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StarPicker value={Math.round(avg ?? 0)} readOnly />
            <span>{avg?.toFixed(1)} · {count} rating{count === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>

      {!hasEnded ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Feedback opens after the event ends.
        </p>
      ) : !userId ? (
        <div className="mt-3">
          <Button variant="outline" onClick={onSignInRedirect}>Sign in to leave feedback</Button>
        </div>
      ) : mine ? (
        <Card className="mt-3">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">You already submitted feedback. Thanks!</p>
            <StarPicker value={mine.rating} readOnly />
            {mine.comment && <p className="text-sm">{mine.comment}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-3">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="mb-1 text-sm font-medium">Your rating</p>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Comment (optional)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="What did you think?"
              />
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit feedback"}
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && summary.recent.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Recent comments</p>
          <ul className="space-y-2">
            {summary.recent.map((r, i) => (
              <li key={i} className="rounded-md border border-border bg-surface/40 p-3">
                <StarPicker value={r.rating} readOnly />
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------- Gallery ----------------

function GallerySection({
  eventId,
  userId,
  onSignInRedirect,
}: {
  eventId: string;
  userId: string | null;
  onSignInRedirect: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: photos } = useQuery({
    queryKey: ["gallery", eventId],
    queryFn: () => getApprovedEventPhotos(eventId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      if (!userId) throw new Error("Not signed in");
      return uploadEventPhoto(eventId, userId, file);
    },
    onSuccess: () => {
      toast.success("Photo uploaded and waiting for Host approval.");
      qc.invalidateQueries({ queryKey: ["gallery", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file);
    e.target.value = "";
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Gallery</h2>
        {userId ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" />
              {upload.isPending ? "Uploading…" : "Upload photo"}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={onSignInRedirect}>Sign in to upload</Button>
        )}
      </div>

      {photos && photos.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-md border border-border">
              <img src={p.image_url} alt="Event photo" loading="lazy" className="aspect-square w-full object-cover" />
              {userId && (
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ReportButton
                    targetType="photo"
                    targetId={p.id}
                    userId={userId}
                    onSignInRedirect={onSignInRedirect}
                    size="sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState
            icon={ImageIcon}
            title="No photos yet"
            description="Approved attendee photos will appear here."
          />
        </div>
      )}
    </section>
  );
}

// ---------------- Report ----------------

function ReportButton({
  targetType,
  targetId,
  userId,
  onSignInRedirect,
  size = "sm",
}: {
  targetType: "event" | "photo";
  targetId: string;
  userId: string | null;
  onSignInRedirect: () => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const submit = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Not signed in");
      return submitReport({ targetType, targetId, reason: reason.trim(), reporterUserId: userId });
    },
    onSuccess: () => {
      toast.success("Report submitted. Thanks for helping keep events safe.");
      setReason("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!userId) {
    return (
      <Button size={size} variant="outline" onClick={onSignInRedirect}>
        <Flag className="mr-1 h-4 w-4" /> Report
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant="outline">
          <Flag className="mr-1 h-4 w-4" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>Tell us why this {targetType} should be reviewed.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          rows={4}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || reason.trim().length < 3}
          >
            {submit.isPending ? "Sending…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
