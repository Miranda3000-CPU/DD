import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarHeart, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface LogCycleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export function LogCycleModal({ open, onClose, onConfirm }: LogCycleModalProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [dateValue, setDateValue] = useState(todayStr);

  const handleConfirm = () => {
    const [y, m, d] = dateValue.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    onConfirm(date);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto px-4 pb-8"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="bg-card rounded-3xl shadow-2xl p-6 border border-border/50">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarHeart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Registrar ciclo</h2>
                    <p className="text-xs text-muted-foreground">Quando começou sua menstruação?</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date picker */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Data de início
                </Label>
                <Input
                  type="date"
                  value={dateValue}
                  max={todayStr}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-12 rounded-2xl border-border/60 text-center text-base focus-visible:ring-primary bg-muted/30"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Você pode escolher uma data passada caso tenha esquecido de registrar.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border-border/60"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
                  onClick={handleConfirm}
                  data-testid="button-log-cycle-confirm"
                >
                  Registrar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
