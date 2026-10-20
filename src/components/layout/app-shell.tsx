import { Suspense } from "react";
import type { Session } from "next-auth";

import { ChatSocketProvider } from "@/components/chat/chat-socket-provider";
import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppNotification } from "@/lib/notifications";

export function AppShell({
  user,
  notifications,
  unreadCount,
  chatUnreadCount,
  chatTeamIds,
  children,
}: {
  user: Session["user"];
  notifications: AppNotification[];
  unreadCount: number;
  chatUnreadCount: number;
  chatTeamIds: string[];
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <ChatSocketProvider
          currentUserId={user.id}
          teamIds={chatTeamIds}
          initialUnreadCount={chatUnreadCount}
        >
          <SidebarProvider>
            <AppSidebar user={user} chatUnreadCount={chatUnreadCount} />
            <SidebarInset className="min-h-0 overflow-hidden">
              <AppNavbar
                user={user}
                notifications={notifications}
                unreadCount={unreadCount}
              />
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </ChatSocketProvider>
      </Suspense>
    </TooltipProvider>
  );
}
