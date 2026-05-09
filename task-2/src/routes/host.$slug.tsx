import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Mail, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/layout/page";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/host/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Host on Gather` },
      { name: "description", content: `Public events hosted by ${params.slug} on Gather.` },
    ],
  }),
  component: PublicHostPage,
});

type Host = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  contact_email: string;
  logo_url: string | null;
};

type PublicEvent = {
  id: string;
  title: string;
  slug: string;
  start_at: string;
  location_type: "venue" | "online";
  venue_address: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PublicHostPage() {
  const { slug } = Route.useParams();

  const { data: host, isLoading } = useQuery({
    queryKey: ["public-host", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hosts")
        .select("id, name, slug, bio, contact_email, logo_url")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Host | null;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["public-host-events", host?.id],
    enabled: !!host?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, slug, start_at, location_type, venue_address")
        .eq("host_id", host!.id)
        .eq("status", "published")
        .eq("visibility", "public")
        .eq("hidden", false)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PublicEvent[];
    },
  });

  if (isLoading) {
    return <div className="container-page py-10 text-muted-foreground">Loading…</div>;
  }

  if (!host) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Globe}
          title="Host not found"
          description={`We couldn't find a host with the slug "${slug}".`}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border bg-surface/50">
        <div className="container-page flex flex-col gap-6 py-12 md:flex-row md:items-center">
          <Avatar className="h-20 w-20">
            {host.logo_url ? <AvatarImage src={host.logo_url} alt="" /> : null}
            <AvatarFallback className="font-display text-xl">
              {host.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Badge variant="secondary" className="rounded-full">
              Host
            </Badge>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              {host.name}
            </h1>
            {host.bio && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{host.bio}</p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> {host.contact_email}
            </p>
          </div>
        </div>
      </div>

      <div className="container-page py-10">
        <PageHeader title="Upcoming events" />
        <div className="mt-6">
          {!events || events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No published events yet"
              description="When this host publishes events, they'll show up here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <Link key={e.id} to="/events/$slug" params={{ slug: e.slug }}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="rounded-full">
                        {e.location_type === "online" ? "Online" : "In person"}
                      </Badge>
                      <h3 className="mt-3 font-display text-lg font-semibold">{e.title}</h3>
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" /> {formatDate(e.start_at)}
                        </div>
                        {e.venue_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> {e.venue_address}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
