import { useState } from 'react';
import { CycleEntry } from '../services/db';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trash2, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface HistoryListProps {
  cycles: CycleEntry[];
  onDelete: (id: number) => void;
  isLoading: boolean;
}

export function HistoryList({ cycles, onDelete, isLoading }: HistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse bg-muted/50 border-none rounded-2xl h-24" />
        ))}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Nenhum histórico</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
          Seus ciclos registrados aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <AnimatePresence>
        {cycles.map((cycle, index) => {
          const startDate = parseISO(cycle.startDate);
          const nextCycle = index > 0 ? cycles[index - 1] : null;
          let cycleLength = '-';
          
          if (nextCycle) {
            const nextStart = parseISO(nextCycle.startDate);
            const diffTime = Math.abs(nextStart.getTime() - startDate.getTime());
            cycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
          }

          return (
            <motion.div
              key={cycle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="font-semibold">{format(startDate, 'd')}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground capitalize">
                        {format(startDate, 'MMMM yyyy', { locale: ptBR })}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {cycleLength !== '-' ? `${cycleLength} dias de ciclo` : 'Ciclo atual'}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem 
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg"
                        onClick={() => cycle.id && onDelete(cycle.id)}
                        data-testid={`delete-cycle-${cycle.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
