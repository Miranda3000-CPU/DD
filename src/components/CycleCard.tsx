import { Droplets, Wind, Star, Sun, Calendar } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { CycleCalculations, Phase } from '../utils/dateUtils';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface CycleCardProps {
  calculations: CycleCalculations | null;
  isLoading: boolean;
}

const PHASE_CONFIG: Record<Phase, { icon: any; color: string; label: string; bgColor: string; borderColor: string }> = {
  Menstrual: { icon: Droplets, color: 'text-primary', label: 'Menstrual', bgColor: 'bg-primary/10', borderColor: 'border-primary/20' },
  Fértil: { icon: Wind, color: 'text-secondary-foreground', label: 'Fértil', bgColor: 'bg-secondary', borderColor: 'border-secondary/30' },
  Ovulação: { icon: Star, color: 'text-[#9b5de5]', label: 'Ovulação', bgColor: 'bg-[#9b5de5]/10', borderColor: 'border-[#9b5de5]/20' },
  Neutro: { icon: Sun, color: 'text-muted-foreground', label: 'Neutro', bgColor: 'bg-muted', borderColor: 'border-muted/30' }
};

export function CycleCard({ calculations, isLoading }: CycleCardProps) {
  if (isLoading) {
    return (
      <Card className="w-full h-[240px] animate-pulse bg-muted/50 border-none rounded-3xl" />
    );
  }

  if (!calculations) {
    return (
      <Card className="w-full bg-card rounded-3xl shadow-sm border-border overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4 h-[240px]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">Nenhum ciclo registrado</h2>
            <p className="text-sm text-muted-foreground mt-1">Registre seu primeiro ciclo para começar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = PHASE_CONFIG[calculations.currentPhase];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={cn(
        "w-full rounded-3xl shadow-sm border transition-all duration-500 overflow-hidden",
        config.bgColor,
        config.borderColor
      )}>
        <CardContent className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-[240px]">
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-background/50 backdrop-blur-sm shadow-sm", config.color)}
          >
            <Icon className="w-10 h-10" />
          </motion.div>
          
          <motion.h2 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn("text-3xl font-semibold tracking-tight mb-2", config.color)}
          >
            Fase {config.label}
          </motion.h2>
          
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 text-foreground/80 font-medium"
          >
            <span>Dia {calculations.cycleDay} do ciclo</span>
            <span className="w-1 h-1 rounded-full bg-foreground/30" />
            <span>Próxima em {calculations.daysUntilNextPeriod} dias</span>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
