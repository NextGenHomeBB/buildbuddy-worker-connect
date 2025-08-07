import { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { Clock, Home, ListCheck, Package, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import SyncStatus from "../SyncStatus";
import CompanyChip from "@/components/CompanyChip";
const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/timer", label: "Timer", icon: Clock },
  { to: "/tasks", label: "Tasks", icon: ListCheck },
  { to: "/materials", label: "Materials", icon: Package },
  { to: "/messages", label: "Chat", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: User },
];

type Props = { title: string };

export default function MobileLayout({ title, children }: PropsWithChildren<Props>) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-14">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-2">
            <CompanyChip />
            <SyncStatus />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-4">{children}</main>

      <Separator />
      <nav aria-label="Bottom Navigation" className="sticky bottom-0 z-20 bg-background/90 backdrop-blur border-t">
        <ul className="grid grid-cols-6">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center py-2 text-xs transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-0.5">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
