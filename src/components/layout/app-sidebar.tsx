"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Columns3,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Settings,
  Ticket,
  Users,
} from "lucide-react";
import type { Session } from "next-auth";

import { useChatUnreadCount } from "@/components/chat/chat-socket-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getInitials } from "@/lib/user";

type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Hidden for tickets-only (Ograniczone) roles. */
  hideWhenRestricted?: boolean;
};

const navItems: NavItem[] = [
  { title: "Pulpit", href: "/", icon: LayoutDashboard, hideWhenRestricted: true },
  {
    title: "Zadania",
    href: "/tasks",
    icon: ListTodo,
    adminOnly: true,
    hideWhenRestricted: true,
  },
  { title: "Tickety", href: "/tickets", icon: Ticket },
  { title: "Tablice", href: "/boards", icon: Columns3, hideWhenRestricted: true },
  { title: "Czat", href: "/chat", icon: MessageCircle, hideWhenRestricted: true },
  {
    title: "Ustawienia",
    href: "/settings",
    icon: Settings,
    adminOnly: true,
    hideWhenRestricted: true,
  },
  { title: "Użytkownicy", href: "/users", icon: Users, hideWhenRestricted: true },
];

function ChatUnreadBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      data-slot="notification-badge"
      className="flex size-4 shrink-0 items-center justify-center bg-destructive text-[10px] font-semibold leading-none text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function AppSidebar({
  user,
  chatUnreadCount = 0,
}: {
  user: Session["user"];
  chatUnreadCount?: number;
}) {
  const pathname = usePathname();
  const isAdmin = user.isAdmin;
  const isRestricted = user.isRestricted;
  const liveUnread = useChatUnreadCount(chatUnreadCount);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href={isRestricted ? "/tickets" : "/"} />}
              tooltip="Kanban"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <KanbanSquare className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">HelpDesk</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Tablice zadań
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Nawigacja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => {
                  if (item.adminOnly && !isAdmin) {
                    return false;
                  }
                  if (isRestricted && item.hideWhenRestricted) {
                    return false;
                  }
                  return true;
                })
                .map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const isChat = item.href === "/chat";
                  const showChatBadge = isChat && liveUnread > 0;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={
                          showChatBadge
                            ? `Czat (${liveUnread > 9 ? "9+" : liveUnread})`
                            : item.title
                        }
                        render={<Link href={item.href} />}
                      >
                        <span className="relative">
                          <item.icon />
                          {showChatBadge ? (
                            <span className="absolute -top-1.5 -right-1.5 hidden group-data-[collapsible=icon]:block">
                              <ChatUnreadBadge count={liveUnread} />
                            </span>
                          ) : null}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{item.title}</span>
                          {showChatBadge ? (
                            <span className="ml-auto group-data-[collapsible=icon]:hidden">
                              <ChatUnreadBadge count={liveUnread} />
                            </span>
                          ) : null}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Profil" render={<Link href="/profile" />}>
              <Avatar size="sm" className="size-4">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "Profil"} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span>{user.name ?? "Profil"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
