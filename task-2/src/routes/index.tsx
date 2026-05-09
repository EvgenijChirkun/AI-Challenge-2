import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, QrCode, Users, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gather — Free community events" },
      {
        name: "description",
        content:
          "Publish free events, collect RSVPs, hand out digital tickets and check guests in at the door — all in one lightweight tool.",
      },
    ],
  }),
  component: Landing,
});

const flow = [
  { icon: Megaphone, label: "Publish", desc: "Hosts share a public event page." },
  { icon: Users, label: "RSVP", desc: "Attendees reserve a free spot." },
  { icon: QrCode, label: "Ticket", desc: "Each guest gets a unique QR code." },
  { icon: CalendarCheck, label: "Check-in", desc: "Checkers scan codes at the venue." },
];

function Landing() {
  return (
    <div>
      <section className="container-page py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs">
              Free community events
            </Badge>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Hosting your next meetup,{" "}
              <span className="text-primary">without the friction.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Gather is a lightweight platform for free events. Publish a page, collect RSVPs,
              issue digital tickets, and check guests in at the door — without spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/host/register">
                  Host an event <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/explore">Browse events</Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-elevated)]">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-y divide-border">
                {flow.map((step, i) => (
                  <div key={step.label} className="flex flex-col gap-2 p-6">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                        <step.icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold">{step.label}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="container-page py-14">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "For Hosts",
                desc: "Create event pages, manage RSVPs, approve gallery uploads, export attendance CSVs.",
                cta: { to: "/host/register", label: "Become a host" },
              },
              {
                title: "For Attendees",
                desc: "Discover events, RSVP in seconds, get a unique digital ticket and bring it to the door.",
                cta: { to: "/explore", label: "Find an event" },
              },
              {
                title: "For Checkers",
                desc: "A focused check-in screen for staff at the venue — one code, one tap, no chaos.",
                cta: { to: "/signin", label: "Sign in to check in" },
              },
            ].map((c) => (
              <Card key={c.title} className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <h3 className="font-display text-xl font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                  <div className="mt-auto pt-2">
                    <Button asChild variant="ghost" size="sm" className="px-0 hover:bg-transparent">
                      <Link to={c.cta.to}>
                        {c.cta.label} <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
