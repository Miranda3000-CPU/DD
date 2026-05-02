import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * PWA install banner — adapts to platform:
 * - Android/Chrome: native beforeinstallprompt button
 * - iOS/Safari: step-by-step "Add to Home Screen" guide
 */
export function InstallPrompt() {
  const { isInstallable, triggerInstall, showIOSGuide, dismiss } = usePWAInstall();
  const [iosExpanded, setIosExpanded] = useState(false);

  return (
    <AnimatePresence>
      {/* ── Android / Chrome native prompt ─────────────────── */}
      {isInstallable && (
        <motion.div
          key="install-android"
          className="fixed top-0 inset-x-0 z-30 max-w-md mx-auto px-4 pt-3"
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="bg-card border border-border/50 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <p className="text-sm text-foreground flex-1 leading-snug">
              Instale o <strong>DD</strong> na tela inicial
            </p>
            <Button
              size="sm"
              className="rounded-xl h-8 px-3 text-xs bg-primary text-primary-foreground shrink-0"
              onClick={triggerInstall}
              data-testid="button-pwa-install"
            >
              Instalar
            </Button>
            <button
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              onClick={dismiss}
              data-testid="button-pwa-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── iOS / Safari manual guide ───────────────────────── */}
      {showIOSGuide && (
        <motion.div
          key="install-ios"
          className="fixed bottom-20 inset-x-0 z-30 max-w-md mx-auto px-4"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="bg-card border border-primary/25 rounded-2xl shadow-xl overflow-hidden">
            {/* Collapsed banner */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
              onClick={() => setIosExpanded((v) => !v)}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <p className="text-sm text-foreground flex-1 leading-snug">
                Adicione o <strong>DD</strong> à tela inicial
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary font-medium">
                  {iosExpanded ? 'Fechar' : 'Ver como'}
                </span>
                <button
                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); dismiss(); }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </button>

            {/* Expanded instructions */}
            <AnimatePresence>
              {iosExpanded && (
                <motion.div
                  key="ios-steps"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mt-3 mb-4">
                      No Safari, siga os passos abaixo:
                    </p>
                    <ol className="space-y-3">
                      {[
                        {
                          icon: <Share className="w-4 h-4 text-blue-500" />,
                          bg: 'bg-blue-50 dark:bg-blue-950/40',
                          text: (
                            <>
                              Toque no botão{' '}
                              <strong className="text-foreground">Compartilhar</strong>{' '}
                              <Share className="inline w-3.5 h-3.5 text-blue-500 -mt-0.5" /> na
                              barra inferior do Safari
                            </>
                          ),
                        },
                        {
                          icon: <MoreHorizontal className="w-4 h-4 text-primary" />,
                          bg: 'bg-primary/5',
                          text: (
                            <>
                              Role até encontrar{' '}
                              <strong className="text-foreground">
                                "Adicionar à Tela de Início"
                              </strong>{' '}
                              e toque
                            </>
                          ),
                        },
                        {
                          icon: <Download className="w-4 h-4 text-green-500" />,
                          bg: 'bg-green-50 dark:bg-green-950/40',
                          text: (
                            <>
                              Confirme tocando em{' '}
                              <strong className="text-foreground">"Adicionar"</strong> — o
                              ícone aparecerá na tela inicial
                            </>
                          ),
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.bg}`}
                          >
                            {item.icon}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pt-1.5">
                            {item.text}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
