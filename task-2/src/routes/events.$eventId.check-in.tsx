import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine, CheckCircle2, XCircle, Undo2, ShieldAlert, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId/check-in")({
  head: ({ params }) => ({ meta: [{ title: `Check-in · ${params.eventId} — Gather` }] }),
  component: CheckinPage,
});

type CheckInState = "success" | "duplicate" | "invalid" | "wrong_event" | "not_confirmed";

type CheckInResult = {
  state: CheckInState;
  message?: string;
  check_in_id?: string;
  rsvp_id?: string;
  ticket_code?: string;
  user_id?: string;
  checked_in_at?: string;
};

type RecentScan = {
  id: string;
  ticket_code: string;
  name: string | null;
  email: string | null;
  checked_in_at: string;
  checked_in_by: string | null;
  undone_at: string | null;
};

function CheckinPage() {
  const { eventId } = Route.useParams();
  const { user, memberships, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastCheckInId, setLastCheckInId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  const { data: eventRow, isLoading: eventLoading } = useQuery({
    queryKey: ["checkin-event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, host_id, title, capacity, start_at, end_at")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const canAccess = useMemo(() => {
    if (!eventRow) return false;
    return memberships.some(
      (m) => m.host_id === eventRow.host_id && (m.role === "host" || m.role === "checker"),
    );
  }, [eventRow, memberships]);

  const { data: counters, refetch: refetchCounters } = useQuery({
    queryKey: ["checkin-counters", eventId],
    enabled: !!eventRow && canAccess,
    queryFn: async () => {
      const [going, waitlist, checkedIn] = await Promise.all([
        supabase
          .from("rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("status", "going"),
        supabase
          .from("rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("status", "waitlisted"),
        supabase
          .from("check_ins")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .is("undone_at", null),
      ]);
      return {
        going: going.count ?? 0,
        waitlist: waitlist.count ?? 0,
        checkedIn: checkedIn.count ?? 0,
      };
    },
  });

  const { data: recent, refetch: refetchRecent } = useQuery({
    queryKey: ["checkin-recent", eventId],
    enabled: !!eventRow && canAccess,
    queryFn: async (): Promise<RecentScan[]> => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("id, checked_in_at, checked_in_by, undone_at, rsvp:rsvps(ticket_code, user_id)")
        .eq("event_id", eventId)
        .order("checked_in_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        checked_in_at: string;
        checked_in_by: string | null;
        undone_at: string | null;
        rsvp: { ticket_code: string; user_id: string } | { ticket_code: string; user_id: string }[] | null;
      }>;
      const userIds = Array.from(
        new Set(
          rows
            .map((r) => (Array.isArray(r.rsvp) ? r.rsvp[0]?.user_id : r.rsvp?.user_id))
            .filter((v): v is string => !!v),
        ),
      );
      let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profiles = Object.fromEntries(
          (profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]),
        );
      }
      return rows.map((r) => {
        const rsvp = Array.isArray(r.rsvp) ? r.rsvp[0] : r.rsvp;
        const profile = rsvp?.user_id ? profiles[rsvp.user_id] : undefined;
        return {
          id: r.id,
          ticket_code: rsvp?.ticket_code ?? "—",
          name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          checked_in_at: r.checked_in_at,
          checked_in_by: r.checked_in_by,
          undone_at: r.undone_at,
        };
      });
    },
  });

  const refresh = () => {
    refetchCounters();
    refetchRecent();
    qc.invalidateQueries({ queryKey: ["checkin-counters", eventId] });
    qc.invalidateQueries({ queryKey: ["checkin-recent", eventId] });
  };

  // optional realtime refresh
  useEffect(() => {
    if (!canAccess || !eventRow) return;
    const ch = supabase
      .channel(`checkins-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins", filter: `event_id=eq.${eventId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, eventRow, eventId]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("check_in_ticket", {
        _event_id: eventId,
        _ticket_code: normalized,
      });
      if (error) throw error;
      const result = data as unknown as CheckInResult;
      setLastResult(result);
      setCode("");
      switch (result.state) {
        case "success":
          setLastCheckInId(result.check_in_id ?? null);
          toast.success(`Checked in ${result.ticket_code}`);
          break;
        case "duplicate":
          toast.warning("Already checked in");
          break;
        case "wrong_event":
          toast.error("Ticket is for a different event");
          break;
        case "not_confirmed":
          toast.error(result.message ?? "Ticket is not confirmed");
          break;
        case "invalid":
        default:
          toast.error(result.message ?? "Invalid ticket code");
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!lastCheckInId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("undo_check_in", { _check_in_id: lastCheckInId });
      if (error) throw error;
      toast.success("Last scan undone");
      setLastCheckInId(null);
      setLastResult(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Undo failed");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || eventLoading) {
    return <div className="container-page py-10 text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={ShieldAlert}
          title="Sign in required"
          description="You must be signed in as a host or checker to access this page."
          action={
            <Button asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!eventRow) {
    return (
      <div className="container-page py-10">
        <EmptyState icon={AlertTriangle} title="Event not found" description="This event does not exist or is not visible to you." />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={ShieldAlert}
          title="Access denied"
          description="Only host and checker members of this event's host can run check-in."
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Checker"
        title={`Check-in · ${eventRow.title}`}
        description="Validate tickets manually by typing or pasting the attendee's ticket code."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <CounterCard label="Going" value={counters?.going ?? 0} />
        <CounterCard label="Waitlist" value={counters?.waitlist ?? 0} />
        <CounterCard label="Checked in" value={`${counters?.checkedIn ?? 0} / ${eventRow.capacity}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" /> Check a ticket
            </CardTitle>
            <CardDescription>Format: GTHR-XXXX-XXXX</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCheck} className="flex gap-2">
              <Input
                placeholder="GTHR-7F2A-9KQ1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono uppercase"
                disabled={busy}
                autoFocus
              />
              <Button type="submit" disabled={busy || !code.trim()}>
                Check in
              </Button>
            </form>

            {lastResult && (
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {lastResult.state === "success" ? (
                      <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Success
                      </Badge>
                    ) : lastResult.state === "duplicate" ? (
                      <Badge variant="secondary" className="gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Already checked in
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3.5 w-3.5" /> {lastResult.state.replace("_", " ")}
                      </Badge>
                    )}
                    {lastResult.ticket_code && (
                      <span className="font-mono text-xs">{lastResult.ticket_code}</span>
                    )}
                  </div>
                  {lastResult.state === "success" && lastCheckInId && (
                    <Button size="sm" variant="outline" onClick={handleUndo} disabled={busy}>
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Undo last scan
                    </Button>
                  )}
                </div>
                {lastResult.message && (
                  <p className="mt-1 text-xs text-muted-foreground">{lastResult.message}</p>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent scans
              </p>
              <div className="divide-y divide-border rounded-md border border-border">
                {(recent ?? []).length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No scans yet.</div>
                ) : (
                  (recent ?? []).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {entry.name ?? entry.email ?? "Guest"}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {entry.ticket_code} ·{" "}
                          {new Date(entry.checked_in_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {entry.undone_at ? (
                        <Badge variant="outline" className="gap-1">
                          <Undo2 className="h-3 w-3" /> Undone
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Capacity</p>
              <p className="font-display text-3xl font-semibold">
                {counters?.checkedIn ?? 0} / {eventRow.capacity}
              </p>
              <p className="text-sm text-muted-foreground">attendees checked in</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CounterCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
