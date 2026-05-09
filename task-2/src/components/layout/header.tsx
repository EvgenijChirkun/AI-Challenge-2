import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  Ticket,
  LayoutDashboard,
  CalendarPlus,
  PlusCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon?: React.ComponentType<{ className?: string }> };

function buildNav({
  signedIn,
  isHost,
  hasAnyMembership,
}: {
  signedIn: boolean;
  isHost: boolean;
  hasAnyMembership: boolean;
}): NavItem[] {
  const explore: NavItem = { to: "/explore", label: "Explore", icon: Sparkles };
  if (!signedIn) return [explore];

  const items: NavItem[] = [
    explore,
    { to: "/tickets", label: "My tickets", icon: Ticket },
  ];
  if (hasAnyMembership) {
    items.push({ to: "/my-events", label: "My events", icon: CalendarPlus });
  }
  if (isHost) {
    items.push({ to: "/dashboard", label: "Host dashboard", icon: LayoutDashboard });
    items.push({ to: "/dashboard/events/new", label: "Create event", icon: PlusCircle });
  }
  return items;
}

export function Header() {
  const { user, email, isHost, isChecker, memberships, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const signedIn = !!user;
  const items = buildNav({
    signedIn,
    isHost,
    hasAnyMembership: memberships.length > 0,
  });

  const roleLabel = isHost ? "Host" : isChecker ? "Checker" : "Attendee";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Gather</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/host/register">Host an event</Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="hidden sm:inline text-xs uppercase tracking-wide text-muted-foreground">
                    {roleLabel}
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {(email ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {email ?? "Signed in"}
                </DropdownMenuLabel>
                {memberships.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Memberships
                    </DropdownMenuLabel>
                    {memberships.map((m) => (
                      <DropdownMenuItem key={m.host_id} disabled className="text-xs">
                        {m.host?.name ?? m.host_id} · {m.role}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border md:hidden">
          <nav className="container-page flex flex-col py-2">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            {!signedIn && (
              <Link
                to="/signin"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-page flex flex-col items-start justify-between gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} Gather — Free community events.</p>
        <p className="text-xs">Host access driven by host_members</p>
      </div>
    </footer>
  );
}
