import { DashboardNav } from "./_components/DashboardNav";
import { SyncOnVisit } from "./_components/SyncOnVisit";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <SyncOnVisit />
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            SpartanTodo
          </span>
        </div>
        <DashboardNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
