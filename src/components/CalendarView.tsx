import { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO,
  isWithinInterval,
  addDays,
  subDays,
  differenceInDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { CycleEntry } from '../services/db';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarViewProps {
  cycles: CycleEntry[];
  settings: { periodDuration: number; cycleLength: number };
}

export function CalendarView({ cycles, settings }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const startDay = monthStart.getDay();
  const prefixDays = Array.from({ length: startDay }).map((_, i) => subDays(monthStart, startDay - i));
  
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const endDay = monthEnd.getDay();
  const suffixDays = Array.from({ length: 6 - endDay }).map((_, i) => addDays(monthEnd, i + 1));
  
  const allDays = [...prefixDays, ...daysInMonth, ...suffixDays];

  const getDayStatus = (day: Date) => {
    if (cycles.length === 0) return 'none';

    // Find the most recent cycle start before or on this day
    const pastCycles = cycles.filter(c => parseISO(c.startDate) <= day).sort((a, b) => 
      parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()
    );

    if (pastCycles.length === 0) return 'none';
    
    const lastCycle = pastCycles[0];
    const cycleStart = parseISO(lastCycle.startDate);
    const diff = differenceInDays(day, cycleStart);

    // If it's more than a reasonable cycle length away, don't color it (unless it's a prediction we want to show)
    if (diff > 45) return 'none';

    // Menstrual phase
    if (diff >= 0 && diff < settings.periodDuration) {
      return 'menstrual';
    }

    // Calculate next expected period based on average cycle length
    // Need all cycles to get the real average, but we'll approximate with settings for now
    const nextExpected = addDays(cycleStart, settings.cycleLength);
    const ovulation = subDays(nextExpected, 14);
    
    if (isSameDay(day, ovulation) || isSameDay(day, addDays(ovulation, 1)) || isSameDay(day, subDays(ovulation, 1))) {
      return 'ovulation';
    }
    
    if (isWithinInterval(day, { start: subDays(ovulation, 5), end: ovulation })) {
      return 'fertile';
    }

    return 'none';
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-3xl p-6 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-medium capitalize text-foreground">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 gap-x-1 relative">
        <AnimatePresence mode="popLayout">
          {allDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const status = getDayStatus(day);
            const isTodayDay = isToday(day);

            return (
              <motion.div 
                key={day.toISOString()}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="aspect-square flex items-center justify-center relative"
              >
                <div 
                  className={cn(
                    "w-10 h-10 flex items-center justify-center text-sm rounded-full transition-colors",
                    !isCurrentMonth && "text-muted-foreground/30",
                    isCurrentMonth && status === 'none' && "text-foreground",
                    status === 'menstrual' && "bg-primary/20 text-primary font-medium",
                    status === 'fertile' && "bg-secondary text-secondary-foreground font-medium",
                    status === 'ovulation' && "bg-[#9b5de5]/20 text-[#9b5de5] font-medium",
                    isTodayDay && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  {format(day, 'd')}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/40"></div>
          <span className="text-xs text-muted-foreground">Menstruação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary"></div>
          <span className="text-xs text-muted-foreground">Período Fértil</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#9b5de5]/40"></div>
          <span className="text-xs text-muted-foreground">Ovulação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-primary"></div>
          <span className="text-xs text-muted-foreground">Hoje</span>
        </div>
      </div>
    </div>
  );
}
