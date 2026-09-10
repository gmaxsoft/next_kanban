import type { Session } from "next-auth";

import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({
  user,
  children,
}: {
  user: Session["user"];
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <AppNavbar user={user} />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
