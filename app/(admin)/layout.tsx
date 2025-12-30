import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[calc(100vh-theme(spacing.16)-theme(spacing.4))] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  );
}
