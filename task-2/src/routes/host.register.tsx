import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/host/register")({
  head: () => ({
    meta: [
      { title: "Become a host — Gather" },
      { name: "description", content: "Register as a host and publish free community events." },
    ],
  }),
  component: HostRegister,
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

const schema = z.object({
  name: z.string().trim().min(2, "Host name must be at least 2 characters").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(60)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers, and dashes"),
  contact_email: z.string().trim().email("Enter a valid email").max(255),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

function HostRegister() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [bio, setBio] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (user?.email && !contactEmail) setContactEmail(user.email);
  }, [user, contactEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first to create a host profile.");
      navigate({ to: "/signin" });
      return;
    }
    const parsed = schema.safeParse({ name, slug, contact_email: contactEmail, bio });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input");
      return;
    }
    setBusy(true);
    try {
      let logo_url: string | null = null;
      if (logoFile) {
        if (logoFile.size > 2 * 1024 * 1024) {
          throw new Error("Logo must be under 2 MB");
        }
        const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `${user.id}/${parsed.data.slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("host-logos")
          .upload(path, logoFile, { contentType: logoFile.type, upsert: false });
        if (upErr) throw upErr;
        logo_url = supabase.storage.from("host-logos").getPublicUrl(path).data.publicUrl;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("hosts")
        .insert({
          owner_user_id: user.id,
          name: parsed.data.name,
          slug: parsed.data.slug,
          contact_email: parsed.data.contact_email,
          bio: parsed.data.bio || null,
          logo_url,
        })
        .select("id, slug")
        .single();

      if (insErr) {
        if (insErr.code === "23505") {
          throw new Error("That slug is already taken — try another.");
        }
        throw insErr;
      }

      const { error: memErr } = await supabase.from("host_members").insert({
        host_id: inserted.id,
        user_id: user.id,
        role: "host",
      });
      if (memErr) throw memErr;

      toast.success("Host created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create host";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="container-page py-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Host onboarding"
        title="Become a Gather host"
        description="Hosts publish events, collect RSVPs, and approve gallery uploads. Free for community organizers."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Host profile</CardTitle>
            <CardDescription>This information appears on your public host page.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Host name</Label>
                  <Input
                    id="name"
                    placeholder="City Runners Club"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Public URL</Label>
                  <div className="flex items-center rounded-md border border-input bg-background">
                    <span className="px-3 text-sm text-muted-foreground">gather.app/host/</span>
                    <Input
                      id="slug"
                      placeholder="city-runners"
                      className="border-0 px-0"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      maxLength={60}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">About your group</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell attendees what you organize..."
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo (optional)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">PNG or JPG, up to 2 MB.</p>
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Creating…" : "Create host profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-surface/60">
            <CardContent className="p-6 text-sm text-muted-foreground">
              <h3 className="mb-2 font-display text-base font-semibold text-foreground">
                What you'll be able to do
              </h3>
              <ul className="space-y-1.5">
                <li>• Create and publish event pages</li>
                <li>• Manage RSVPs and capacity</li>
                <li>• Issue digital tickets with QR codes</li>
                <li>• Invite Checkers for door check-in</li>
                <li>• Approve gallery uploads</li>
                <li>• Export attendance to CSV</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
