import type { Session } from "next-auth";

import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppNotification } from "@/lib/notifications";

export function AppShell({
  user,
  notifications,
  unreadCount,
  children,
}: {
  user: Session["user"];
  notifications: AppNotification[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <AppNavbar
            user={user}
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
