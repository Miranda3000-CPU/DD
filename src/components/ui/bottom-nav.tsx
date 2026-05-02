import { Link, useLocation } from "wouter";
import { Home, Calendar, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/calendar", icon: Calendar, label: "Calendário" },
    { path: "/history", icon: Clock, label: "Histórico" },
    { path: "/settings", icon: Settings, label: "Config" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-4">
        {tabs.map((tab) => {
          const isActive = location === tab.path;
          const Icon = tab.icon;
          return (
            <Link key={tab.path} href={tab.path}>
              <div 
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full gap-1 cursor-pointer transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-${tab.label.toLowerCase()}`}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
                <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
