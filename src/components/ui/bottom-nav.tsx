import { Link, useLocation } from "wouter";
import { Home, Calendar, Clock, Settings, HeartPulse, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const tabs = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/calendar", icon: Calendar, label: "Calendário" },
    { path: "/daily", icon: HeartPulse, label: "Diário" },
    { path: "/history", icon: Clock, label: "Histórico" },
    { path: "/guide", icon: BookOpen, label: "Guia" },
    { path: "/settings", icon: Settings, label: "Ajustes" },
  ];
  return <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
    <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
      {tabs.map(tab => {
        const active = location === tab.path;
        const Icon = tab.icon;
        return <Link key={tab.path} href={tab.path} aria-label={tab.label}>
          <div className={cn("flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")} aria-current={active ? "page" : undefined} data-testid={`nav-${tab.label.toLowerCase()}`}>
            <Icon className={cn("h-5 w-5", active && "scale-110")} />
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </div>
        </Link>;
      })}
    </div>
  </nav>;
}
