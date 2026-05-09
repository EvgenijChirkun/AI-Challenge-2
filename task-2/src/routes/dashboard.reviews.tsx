import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Flag, Shield, Check, X, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { moderatePhoto } from "@/lib/gallery";
import { reviewReport } from "@/lib/reports";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/reviews")({
  head: () => ({ meta: [{ title: "Review queue — Gather" }] }),
  component: ReviewQueue,
});

type EventLite = { id: string; title: string; host_id: string; hidden: boolean };

type PendingPhoto = {
  id: string;
  event_id: string;
  image_url: string;
  status: "pending" | "approved" | "rejected";
  hidden: boolean;
  created_at: string;
  uploaded_by: string | null;
  event?: EventLite | null;
};

type ReportRow = {
  id: string;
  target_type: "event" | "photo";
  target_id: string;
  reason: string;
  status: "open" | "reviewed" | "hidden";
  created_at: string;
  reporter_user_id: string | null;
  reporter?: { full_name: string | null; email: string | null } | null;
  event?: EventLite | null;
  photo_url?: string | null;
};

function ReviewQueue() {
  const { user, isHost, memberships, loading } = useAuth();

  if (loading) {
    return <div className="container-page py-10 text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Shield}
          title="Sign in required"
          description="You need to sign in to access the review queue."
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
          icon={Shield}
          title="Hosts only"
          description="The review queue is available to Host role members."
        />
      </div>
    );
  }

  const hostIds = memberships.filter((m) => m.role === "host").map((m) => m.host_id);
  return <ReviewQueueLoaded hostIds={hostIds} userId={user.id} />;
}

function ReviewQueueLoaded({ hostIds, userId: _userId }: { hostIds: string[]; userId: string }) {
  const qc = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["review-events", hostIds],
    queryFn: async (): Promise<EventLite[]> => {
      if (hostIds.length === 0) return [];
      const { data, error } = await supabase
        .from("events")
        .select("id, title, host_id, hidden")
        .in("host_id", hostIds);
      if (error) throw error;
      return (data ?? []) as EventLite[];
    },
  });

  const eventIds = (eventsQuery.data ?? []).map((e) => e.id);
  const eventsById = new Map((eventsQuery.data ?? []).map((e) => [e.id, e]));

  const photosQuery = useQuery({
    queryKey: ["review-pending-photos", eventIds],
    queryFn: async (): Promise<PendingPhoto[]> => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, event_id, image_url, status, hidden, created_at, uploaded_by")
        .in("event_id", eventIds)
        .eq("status", "pending")
        .eq("hidden", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as PendingPhoto[]).map((p) => ({ ...p, event: eventsById.get(p.event_id) ?? null }));
    },
    enabled: eventIds.length > 0,
  });

  const reportsQuery = useQuery({
    queryKey: ["review-reports", eventIds],
    queryFn: async (): Promise<ReportRow[]> => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("reports")
        .select("id, target_type, target_id, reason, status, created_at, reporter_user_id, reporter:profiles!reports_reporter_user_id_fkey(full_name, email)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as ReportRow[];

      // Resolve photo->event for photo reports
      const photoIds = rows.filter((r) => r.target_type === "photo").map((r) => r.target_id);
      let photoMap = new Map<string, { event_id: string; image_url: string }>();
      if (photoIds.length > 0) {
        const { data: photos } = await supabase
          .from("gallery_photos")
          .select("id, event_id, image_url")
          .in("id", photoIds);
        photoMap = new Map((photos ?? []).map((p) => [p.id, { event_id: p.event_id, image_url: p.image_url }]));
      }

      const out: ReportRow[] = [];
      for (const r of rows) {
        if (r.target_type === "event") {
          const ev = eventsById.get(r.target_id);
          if (ev) out.push({ ...r, event: ev });
        } else {
          const ph = photoMap.get(r.target_id);
          if (!ph) continue;
          const ev = eventsById.get(ph.event_id);
          if (!ev) continue;
          out.push({ ...r, event: ev, photo_url: ph.image_url });
        }
      }
      return out;
    },
    enabled: eventIds.length > 0,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["review-pending-photos"] });
    qc.invalidateQueries({ queryKey: ["review-reports"] });
    qc.invalidateQueries({ queryKey: ["review-events"] });
  };

  const approvePhoto = useMutation({
    mutationFn: (id: string) => moderatePhoto(id, { status: "approved" }),
    onSuccess: () => { toast.success("Photo approved"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rejectPhoto = useMutation({
    mutationFn: (id: string) => moderatePhoto(id, { status: "rejected" }),
    onSuccess: () => { toast.success("Photo rejected"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const hidePhoto = useMutation({
    mutationFn: (id: string) => moderatePhoto(id, { hidden: true }),
    onSuccess: () => { toast.success("Photo hidden"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const hideEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").update({ hidden: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event hidden"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reviewMut = useMutation({
    mutationFn: (params: { id: string; status: "reviewed" | "hidden" }) =>
      reviewReport(params.id, params.status),
    onSuccess: () => { toast.success("Report updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const photos = photosQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Moderation"
        title="Review queue"
        description="Approve gallery uploads and review reports for events under your hosts."
      />

      <Tabs defaultValue="uploads" className="mt-6">
        <TabsList>
          <TabsTrigger value="uploads">
            <ImageIcon className="mr-2 h-4 w-4" /> Pending photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Flag className="mr-2 h-4 w-4" /> Open reports ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uploads" className="mt-6">
          {photos.length === 0 ? (
            <EmptyState icon={ImageIcon} title="No pending photos" description="New uploads will appear here for approval." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <img src={p.image_url} alt="Pending upload" className="aspect-video w-full object-cover" />
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{p.event?.title ?? "Event"}</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1" disabled={approvePhoto.isPending} onClick={() => approvePhoto.mutate(p.id)}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" disabled={rejectPhoto.isPending} onClick={() => rejectPhoto.mutate(p.id)}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full" disabled={hidePhoto.isPending} onClick={() => hidePhoto.mutate(p.id)}>
                      <EyeOff className="mr-1 h-4 w-4" /> Hide
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          {reports.length === 0 ? (
            <EmptyState icon={Flag} title="No open reports" description="Reports from attendees will appear here." />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                    {r.target_type === "photo" && r.photo_url && (
                      <img src={r.photo_url} alt="" className="h-24 w-24 flex-none rounded-md object-cover" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{r.target_type === "event" ? "Event report" : "Photo report"}</Badge>
                        <span className="text-sm font-medium">{r.event?.title ?? "Event"}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{r.reason}</p>
                      {r.reporter && (
                        <p className="text-xs text-muted-foreground">
                          Reported by {r.reporter.full_name ?? r.reporter.email ?? "anonymous"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.target_type === "event" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={hideEvent.isPending || r.event?.hidden}
                          onClick={() => hideEvent.mutate(r.target_id)}
                        >
                          <EyeOff className="mr-1 h-4 w-4" /> Hide event
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={hidePhoto.isPending}
                          onClick={() => hidePhoto.mutate(r.target_id)}
                        >
                          <EyeOff className="mr-1 h-4 w-4" /> Hide photo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={reviewMut.isPending}
                        onClick={() => reviewMut.mutate({ id: r.id, status: "reviewed" })}
                      >
                        Mark reviewed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
