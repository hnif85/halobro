import { Sidebar } from "@/components/ui/sidebar";
import { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0d0d0f]">
      <Sidebar />
      <main className="flex-1 ml-[220px] min-h-screen transition-all duration-200">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}