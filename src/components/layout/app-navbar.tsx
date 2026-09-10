"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Search, UserRound } from "lucide-react";
import type { Session } from "next-auth";

import { logout } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getInitials } from "@/lib/user";

const pageTitles: Record<string, string> = {
  "/": "Pulpit",
  "/boards": "Tablice",
  "/chat": "Czat",
  "/settings": "Ustawienia",
  "/profile": "Profil",
  "/users": "Użytkownicy",
};

function getPageTitle(pathname: string) {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  const match = Object.keys(pageTitles)
    .filter((href) => href !== "/" && pathname.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];

  return match ? pageTitles[match] : "Next Kanban";
}

export function AppNavbar({ user }: { user: Session["user"] }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const initials = getInitials(user.name);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5 self-center" />
      <h1 className="text-sm font-medium">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden w-64 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Szukaj tablic i zadań..."
            className="h-8 pl-8"
          />
        </div>

        <Button variant="ghost" size="icon-sm" aria-label="Powiadomienia">
          <Bell />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="rounded-full" />
            }
          >
            <Avatar size="sm">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "Użytkownik"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="grid">
                  <span className="truncate font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="truncate text-xs font-normal">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem render={<Link href="/profile" />}>
                <UserRound />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                Ustawienia
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut />
              Wyloguj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
