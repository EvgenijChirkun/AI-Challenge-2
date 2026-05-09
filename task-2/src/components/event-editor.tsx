import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ExternalLink, Copy, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { slugify, randomSuffix } from "@/lib/slug";

type LocationType = "venue" | "online";
type Visibility = "public" | "unlisted";
type Status = "draft" | "published";

const COMMON_TZ = [
  "UTC",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
];

function getBrowserTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

const baseSchema = z
  .object({
    host_id: z.string().uuid("Select a host"),
    title: z.string().trim().min(2, "Title is required").max(140),
    slug: z
      .string()
      .trim()
      .min(2, "Slug is required")
      .max(80)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers, and dashes"),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    start_at: z.string().min(1, "Start date/time required"),
    end_at: z.string().min(1, "End date/time required"),
    timezone: z.string().min(1, "Time zone required"),
    location_type: z.enum(["venue", "online"]),
    venue_address: z.string().trim().max(300).optional().or(z.literal("")),
    online_link: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
    capacity: z.number().int().positive("Capacity must be a positive integer").max(1000000),
    visibility: z.enum(["public", "unlisted"]),
  })
  .refine((d) => new Date(d.end_at).getTime() > new Date(d.start_at).getTime(), {
    message: "End must be after start",
    path: ["end_at"],
  })
  .refine((d) => d.location_type !== "venue" || (d.venue_address && d.venue_address.length > 0), {
    message: "Venue address is required for in-person events",
    path: ["venue_address"],
  })
  .refine((d) => d.location_type !== "online" || (d.online_link && d.online_link.length > 0), {
    message: "Online link is required for online events",
    path: ["online_link"],
  });

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  slug: string;
  description: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: LocationType;
  venue_address: string | null;
  online_link: string | null;
  capacity: number;
  visibility: Visibility;
  status: Status;
  is_paid: boolean;
  cover_image_url: string | null;
  hidden: boolean;
};

export function EventEditor({ eventId }: { eventId?: string }) {
  const { user, memberships, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const hostMemberships = useMemo(
    () => memberships.filter((m) => m.role === "host" && m.host),
    [memberships],
  );

  const isEdit = !!eventId;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["event", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, host_id, title, slug, description, start_at, end_at, timezone, location_type, venue_address, online_link, capacity, visibility, status, is_paid, cover_image_url, hidden",
        )
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data as EventRow | null;
    },
  });

  const [hostId, setHostId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timezone, setTimezone] = useState(getBrowserTz());
  const [locationType, setLocationType] = useState<LocationType>("venue");
  const [venueAddress, setVenueAddress] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [capacity, setCapacity] = useState<number | "">(50);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Hydrate when editing
  useEffect(() => {
    if (!existing) return;
    setHostId(existing.host_id);
    setTitle(existing.title);
    setSlug(existing.slug);
    setSlugTouched(true);
    setDescription(existing.description ?? "");
    setStartAt(toLocalInput(existing.start_at));
    setEndAt(toLocalInput(existing.end_at));
    setTimezone(existing.timezone);
    setLocationType(existing.location_type);
    setVenueAddress(existing.venue_address ?? "");
    setOnlineLink(existing.online_link ?? "");
    setCapacity(existing.capacity);
    setVisibility(existing.visibility);
  }, [existing]);

  // Default host
  useEffect(() => {
    if (!isEdit && !hostId && hostMemberships[0]) {
      setHostId(hostMemberships[0].host_id);
    }
  }, [isEdit, hostId, hostMemberships]);

  // Auto-slug
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  if (authLoading || (isEdit && loadingExisting)) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-sm">
          You need to <Link to="/signin" className="text-primary underline">sign in</Link> to manage events.
        </CardContent>
      </Card>
    );
  }

  if (hostMemberships.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm">
          You need a Host profile to create events.{" "}
          <Link to="/host/register" className="text-primary underline">Become a host</Link>.
        </CardContent>
      </Card>
    );
  }

  if (isEdit && existing && !hostMemberships.some((m) => m.host_id === existing.host_id)) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          You are not a host of this event.
        </CardContent>
      </Card>
    );
  }

  async function uploadCover(forSlug: string): Promise<string | null> {
    if (!coverFile || !user) return null;
    if (coverFile.size > 5 * 1024 * 1024) {
      throw new Error("Cover image must be under 5 MB");
    }
    const ext = coverFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${user.id}/${forSlug}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("cover-images")
      .upload(path, coverFile, { contentType: coverFile.type, upsert: false });
    if (upErr) throw upErr;
    return supabase.storage.from("cover-images").getPublicUrl(path).data.publicUrl;
  }

  const validateAndPayload = () => {
    const parsed = baseSchema.safeParse({
      host_id: hostId,
      title,
      slug,
      description,
      start_at: fromLocalInput(startAt) ?? "",
      end_at: fromLocalInput(endAt) ?? "",
      timezone,
      location_type: locationType,
      venue_address: venueAddress,
      online_link: onlineLink,
      capacity: typeof capacity === "number" ? capacity : Number(capacity),
      visibility,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input");
      return null;
    }
    return parsed.data;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = validateAndPayload();
    if (!data) return;
    setBusy(true);
    try {
      let cover_image_url: string | null = existing?.cover_image_url ?? null;
      if (coverFile) cover_image_url = await uploadCover(data.slug);

      if (isEdit && existing) {
        const { error } = await supabase
          .from("events")
          .update({
            title: data.title,
            slug: data.slug,
            description: data.description || null,
            start_at: data.start_at,
            end_at: data.end_at,
            timezone: data.timezone,
            location_type: data.location_type,
            venue_address: data.location_type === "venue" ? data.venue_address || null : null,
            online_link: data.location_type === "online" ? data.online_link || null : null,
            capacity: data.capacity,
            visibility: data.visibility,
            cover_image_url,
            is_paid: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) {
          if (error.code === "23505") throw new Error("That slug is already used by this host.");
          throw error;
        }
        toast.success("Event saved");
        qc.invalidateQueries({ queryKey: ["event", existing.id] });
        qc.invalidateQueries({ queryKey: ["host-events"] });
      } else {
        const { data: ins, error } = await supabase
          .from("events")
          .insert({
            host_id: data.host_id,
            title: data.title,
            slug: data.slug,
            description: data.description || null,
            start_at: data.start_at,
            end_at: data.end_at,
            timezone: data.timezone,
            location_type: data.location_type,
            venue_address: data.location_type === "venue" ? data.venue_address || null : null,
            online_link: data.location_type === "online" ? data.online_link || null : null,
            capacity: data.capacity,
            visibility: data.visibility,
            status: "draft",
            cover_image_url,
            is_paid: false,
          })
          .select("id")
          .single();
        if (error) {
          if (error.code === "23505") throw new Error("That slug is already used by this host.");
          throw error;
        }
        toast.success("Draft created");
        qc.invalidateQueries({ queryKey: ["host-events"] });
        navigate({ to: "/dashboard/events/$eventId", params: { eventId: ins.id } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (next: Status) => {
    if (!existing) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      toast.success(next === "published" ? "Event published" : "Event unpublished");
      qc.invalidateQueries({ queryKey: ["event", existing.id] });
      qc.invalidateQueries({ queryKey: ["host-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      const newTitle = `${existing.title} Copy`;
      const newSlug = `${slugify(existing.slug)}-${randomSuffix()}`.slice(0, 80);
      const { data: ins, error } = await supabase
        .from("events")
        .insert({
          host_id: existing.host_id,
          title: newTitle,
          slug: newSlug,
          description: existing.description,
          start_at: existing.start_at,
          end_at: existing.end_at,
          timezone: existing.timezone,
          location_type: existing.location_type,
          venue_address: existing.venue_address,
          online_link: existing.online_link,
          capacity: existing.capacity,
          visibility: existing.visibility,
          status: "draft",
          cover_image_url: existing.cover_image_url,
          is_paid: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Event duplicated");
      qc.invalidateQueries({ queryKey: ["host-events"] });
      navigate({ to: "/dashboard/events/$eventId", params: { eventId: ins.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate");
    } finally {
      setBusy(false);
    }
  };

  const status: Status = existing?.status ?? "draft";

  return (
    <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>Tell attendees what this event is about.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hostMemberships.length > 1 && !isEdit && (
              <div className="space-y-2">
                <Label>Host</Label>
                <Select value={hostId} onValueChange={setHostId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select host" />
                  </SelectTrigger>
                  <SelectContent>
                    {hostMemberships.map((m) => (
                      <SelectItem key={m.host_id} value={m.host_id}>
                        {m.host?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday Morning Run"
                maxLength={140}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Public URL slug</Label>
              <div className="flex items-center rounded-md border border-input bg-background">
                <span className="px-3 text-sm text-muted-foreground">/events/</span>
                <Input
                  id="slug"
                  className="border-0 px-0"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  maxLength={80}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell attendees what to expect…"
                maxLength={5000}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>When</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tz">Time zone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([getBrowserTz(), ...COMMON_TZ])).map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={locationType}
              onValueChange={(v) => setLocationType(v as LocationType)}
              className="grid grid-cols-2 gap-3"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3">
                <RadioGroupItem value="venue" /> In person
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3">
                <RadioGroupItem value="online" /> Online
              </Label>
            </RadioGroup>
            {locationType === "venue" ? (
              <div className="space-y-2">
                <Label htmlFor="venue">Venue address</Label>
                <Input
                  id="venue"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Riverside Park, main entrance"
                  maxLength={300}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="link">Online link</Label>
                <Input
                  id="link"
                  type="url"
                  value={onlineLink}
                  onChange={(e) => setOnlineLink(e.target.value)}
                  placeholder="https://meet.example.com/abc"
                  maxLength={500}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cap">Capacity</Label>
              <Input
                id="cap"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover image</CardTitle>
            <CardDescription>Optional. Shown on the public event page and social previews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {existing?.cover_image_url && !coverFile && (
              <img
                src={existing.cover_image_url}
                alt=""
                className="h-32 w-full rounded-md object-cover"
              />
            )}
            <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">PNG/JPG, up to 5 MB.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEdit && (
              <div className="flex items-center gap-2">
                <Badge variant={status === "published" ? "default" : "secondary"}>{status}</Badge>
                <Badge variant="outline">{visibility}</Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — listed everywhere</SelectItem>
                  <SelectItem value="unlisted">Unlisted — direct link only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pricing</Label>
              <RadioGroup value="free" className="grid grid-cols-2 gap-2">
                <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-2">
                  <RadioGroupItem value="free" /> Free
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Label className="flex cursor-not-allowed items-center gap-2 rounded-md border border-input p-2 opacity-60">
                          <RadioGroupItem value="paid" disabled /> Paid
                        </Label>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : isEdit ? "Save changes" : "Save draft"}
              </Button>

              {isEdit && existing && (
                <>
                  {status === "draft" ? (
                    <Button type="button" variant="default" onClick={() => setStatus("published")} disabled={busy}>
                      <Eye className="mr-1 h-4 w-4" /> Publish
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setStatus("draft")} disabled={busy}>
                      <EyeOff className="mr-1 h-4 w-4" /> Unpublish
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={handleDuplicate} disabled={busy}>
                    <Copy className="mr-1 h-4 w-4" /> Duplicate
                  </Button>
                  {status === "published" && (
                    <Button asChild type="button" variant="ghost">
                      <Link to="/events/$slug" params={{ slug: existing.slug }} target="_blank">
                        <ExternalLink className="mr-1 h-4 w-4" /> View public page
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
