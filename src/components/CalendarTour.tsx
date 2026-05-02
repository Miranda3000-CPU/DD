import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Droplets, Leaf, Circle } from 'lucide-react';
import { Button } from './ui/button';

interface CalendarTourProps {
  visible: boolean;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: <Droplets className="w-6 h-6" />,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-100 text-rose-600',
    dotColor: 'bg-rose-400',
    title: 'Dias de menstruação',
    description:
      'Os dias marcados em rosa indicam o período de fluxo menstrual. O número de dias é baseado na duração configurada nas preferências.',
    step: 1,
  },
  {
    icon: <Leaf className="w-6 h-6" />,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100 text-blue-600',
    dotColor: 'bg-blue-400',
    title: 'Período fértil',
    description:
      'Os dias em azul representam a janela fértil — aproximadamente 5 dias antes da ovulação. A fertilidade é maior neste período.',
    step: 2,
  },
  {
    icon: <Circle className="w-6 h-6 fill-purple-400" />,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100 text-purple-600',
    dotColor: 'bg-purple-400',
    title: 'Dia da ovulação',
    description:
      'O dia em roxo é a ovulação prevista — cerca de 14 dias antes da próxima menstruação. É o pico de fertilidade do ciclo.',
    step: 3,
  },
];

export function CalendarTour({ visible, onDismiss }: CalendarTourProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      onDismiss();
      setStep(0);
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Dim overlay */}
          <motion.div
            key="tour-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Step card — slides up from bottom */}
          <motion.div
            key={`tour-step-${step}`}
            className="fixed bottom-20 inset-x-0 z-50 max-w-md mx-auto px-4"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <div className="bg-card border border-border/50 rounded-3xl shadow-2xl p-6">
              {/* Step dots */}
              <div className="flex justify-center gap-2 mb-5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? 'w-6 bg-primary'
                        : i < step
                        ? 'w-3 bg-primary/40'
                        : 'w-3 bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Color swatch + icon */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 ${current.color}`}
                >
                  {current.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${current.dotColor}`} />
                    <span className="text-xs text-muted-foreground font-medium">
                      Passo {step + 1} de {STEPS.length}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {current.description}
              </p>

              {/* Navigation */}
              <div className="flex gap-3">
                {step > 0 ? (
                  <Button
                    variant="outline"
                    className="h-11 w-11 rounded-2xl border-border/60 p-0 shrink-0"
                    onClick={prev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-11 flex-1 rounded-2xl text-muted-foreground text-sm"
                    onClick={onDismiss}
                  >
                    Pular
                  </Button>
                )}

                <Button
                  className="h-11 flex-1 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
                  onClick={next}
                  data-testid={isLast ? 'button-calendar-tour-ok' : 'button-tour-next'}
                >
                  {isLast ? (
                    <>
                      <Check className="w-4 h-4" />
                      Entendido
                    </>
                  ) : (
                    <>
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
