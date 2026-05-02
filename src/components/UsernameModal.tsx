import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface UsernameModalProps {
  visible: boolean;
  onSave: (name: string) => void;
}

/**
 * Shown once (after privacy notice) to collect the user's name.
 * If the user skips, a blank name is saved so the modal doesn't reappear.
 */
export function UsernameModal({ visible, onSave }: UsernameModalProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    onSave(name.trim() || 'você');
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="username-backdrop"
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            key="username-sheet"
            className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
          >
            <div className="bg-card rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-border/30">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Sparkles className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1">
                Bem-vinda ao Ciclo!
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Como podemos te chamar?
              </p>

              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="rounded-xl h-12 text-base mb-4 border-border/60 focus-visible:ring-primary"
                autoFocus
                data-testid="input-username"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl"
                  onClick={() => onSave('você')}
                  data-testid="button-username-skip"
                >
                  Pular
                </Button>
                <Button
                  className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
                  onClick={handleSave}
                  disabled={!name.trim()}
                  data-testid="button-username-save"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
