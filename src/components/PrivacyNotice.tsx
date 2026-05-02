import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface PrivacyNoticeProps {
  visible: boolean;
  onAcknowledge: () => void;
}

/**
 * One-time privacy notice shown on first launch.
 * Rendered as a bottom sheet overlay — does not block app usage.
 */
export function PrivacyNotice({ visible, onAcknowledge }: PrivacyNoticeProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="privacy-backdrop"
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            key="privacy-sheet"
            className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="bg-card rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-border/30">
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Shield className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">
                Seus dados ficam com você
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                O <strong className="text-foreground">Ciclo</strong> foi desenvolvido por{' '}
                <strong className="text-foreground">Jeiel Miranda</strong> e não coleta
                nenhum dado pessoal. Tudo é armazenado exclusivamente no seu dispositivo,
                sem servidores externos.
              </p>

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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
