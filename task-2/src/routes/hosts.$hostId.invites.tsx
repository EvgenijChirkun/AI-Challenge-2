import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Plus, Trash2 } from "lucide-react";
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
import { PageHeader, EmptyState } from "@/components/layout/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/hosts/$hostId/invites")({
  head: () => ({ meta: [{ title: "Host invites — Gather" }] }),
  component: HostInvitesPage,
});

type InviteRow = {
  id: string;
  host_id: string;
  role: "host" | "checker";
  token: string;
  expires_at: string | null;
  created_at: string;
};

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

function HostInvitesPage() {
  const { hostId } = Route.useParams();
  const { user, memberships, loading } = useAuth();
  const qc = useQueryClient();
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [busy, setBusy] = useState(false);

  const isHostForThis = memberships.some(
    (m) => m.host_id === hostId && m.role === "host",
  );

  const { data: host } = useQuery({
    queryKey: ["host", hostId],
    enabled: !!hostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hosts")
        .select("id, name, slug")
        .eq("id", hostId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: invites, isLoading } = useQuery({
    queryKey: ["host-invites", hostId],
    enabled: !!user && isHostForThis,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_invites")
        .select("id, host_id, role, token, expires_at, created_at")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
  });

  if (loading) return <div className="container-page py-10 text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Mail}
          title="Sign in required"
          description="Sign in as a host to manage invite links."
          action={
            <Button asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!isHostForThis) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={Mail}
          title="Access denied"
          description="Only hosts of this organization can manage invite links."
        />
      </div>
    );
  }

  const createInvite = async () => {
    setBusy(true);
    try {
      const token =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)) +
        "-" +
        Math.random().toString(36).slice(2, 8);
      const { error } = await supabase.from("host_invites").insert({
        host_id: hostId,
        role,
        token,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Invite link created");
      qc.invalidateQueries({ queryKey: ["host-invites", hostId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invite");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invite revoked");
    qc.invalidateQueries({ queryKey: ["host-invites", hostId] });
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Host"
        title={host?.name ? `${host.name} — Invites` : "Host invites"}
        description="Generate links to invite collaborators as Host or Checker."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Create invite link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as "host" | "checker")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checker">Checker — can run check-in only</SelectItem>
                <SelectItem value="host">Host — full host access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createInvite} disabled={busy}>
            <Plus className="mr-1 h-4 w-4" /> Create link
          </Button>
        </CardContent>
      </Card>

      <section className="mt-8 space-y-3">
        <h3 className="font-display text-lg font-semibold">Active invites</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !invites || invites.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No invites yet"
            description="Create your first invite link to share with collaborators."
          />
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.role === "host" ? "default" : "secondary"}>
                        {inv.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(inv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <code className="mt-1 block truncate text-xs text-muted-foreground">
                      {inviteUrl(inv.token)}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(inv.token)}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => revoke(inv.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
