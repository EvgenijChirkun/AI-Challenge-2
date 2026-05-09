import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invite — Gather" }] }),
  component: AcceptInvitePage,
});

type AcceptResult =
  | { state: "accepted"; host_id: string; role: "host" | "checker" }
  | { state: "already_member"; host_id: string; role: "host" | "checker" }
  | { state: "expired" | "invalid"; message: string };

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AcceptResult | null>(null);

  useEffect(() => {
    if (loading || !user || result || busy) return;
    (async () => {
      setBusy(true);
      const { data, error } = await supabase.rpc("accept_host_invite", { _token: token });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        setResult({ state: "invalid", message: error.message });
        return;
      }
      const r = data as unknown as AcceptResult;
      setResult(r);
      if (r.state === "accepted") {
        toast.success(`You are now a ${r.role} for this host`);
        setTimeout(() => {
          navigate({ to: r.role === "host" ? "/dashboard" : "/my-events" });
        }, 1200);
      } else if (r.state === "already_member") {
        toast.message("You're already a member");
      }
    })();
  }, [user, loading, token, result, busy, navigate]);

  if (loading) return <div className="container-page py-10 text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-2xl">You're invited to Gather</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to accept this host invite.
            </p>
            <Button asChild className="w-full">
              <Link
                to="/signin"
                search={{ redirect: `/invite/${token}` }}
              >
                Sign in to accept
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Mail className="h-5 w-5 text-primary" /> Host invite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {busy && <p className="text-muted-foreground">Accepting invite…</p>}
          {result?.state === "accepted" && (
            <>
              <p>You're now a {result.role} for this host.</p>
              <Button asChild className="w-full">
                <Link to={result.role === "host" ? "/dashboard" : "/my-events"}>Continue</Link>
              </Button>
            </>
          )}
          {result?.state === "already_member" && (
            <>
              <p>You are already a member of this host as {result.role}.</p>
              <Button asChild className="w-full">
                <Link to="/my-events">Go to My events</Link>
              </Button>
            </>
          )}
          {(result?.state === "invalid" || result?.state === "expired") && (
            <>
              <p className="text-destructive">{result.message}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Back home</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
