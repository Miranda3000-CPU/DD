import { BottomDialog, BottomDialogTitle, BottomDialogDescription } from './ui/bottom-dialog';
import { Shield, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface PrivacyNoticeProps {
  visible: boolean;
  onAcknowledge: () => void;
}

/**
 * One-time privacy notice shown on first launch.
 */
export function PrivacyNotice({ visible, onAcknowledge }: PrivacyNoticeProps) {
  return (
    <BottomDialog open={visible} onDismiss={onAcknowledge}>
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        <Shield className="w-6 h-6" />
      </div>

      <BottomDialogTitle className="text-xl font-bold text-foreground mb-2">
        Seus dados ficam com você
      </BottomDialogTitle>

      <BottomDialogDescription className="text-sm text-muted-foreground leading-relaxed mb-1">
        O <strong className="text-foreground">Diário Dela</strong> foi desenvolvido por{' '}
        <strong className="text-foreground">Jeiel Miranda</strong> para você, Giovanna, e não coleta
        nenhum dado pessoal. Tudo é armazenado exclusivamente no seu dispositivo, sem servidores
        externos.
      </BottomDialogDescription>

      <a
        href="https://jeielmiranda.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary mt-1 mb-5"
        data-testid="link-privacy-author"
      >
        jeielmiranda.com.br
        <ExternalLink className="w-3 h-3" />
      </a>

      <Button
        className="w-full h-13 rounded-2xl bg-primary text-primary-foreground text-base font-semibold"
        onClick={onAcknowledge}
        data-testid="button-privacy-ok"
      >
        Entendido
      </Button>
    </BottomDialog>
  );
}
