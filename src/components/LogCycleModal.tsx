import { useState } from 'react';
import { format } from 'date-fns';
import { BottomDialog, BottomDialogTitle, BottomDialogDescription } from './ui/bottom-dialog';
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
    <BottomDialog open={open} onDismiss={onClose} dismissOnBackdrop>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarHeart className="w-5 h-5" />
          </div>
          <div>
            <BottomDialogTitle className="text-base font-semibold text-foreground">
              Registrar ciclo
            </BottomDialogTitle>
            <BottomDialogDescription className="text-xs text-muted-foreground">
              Quando começou sua menstruação?
            </BottomDialogDescription>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Date picker */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-foreground mb-2 block">Data de início</Label>
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
          aria-label="Fechar"
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
    </BottomDialog>
  );
}
