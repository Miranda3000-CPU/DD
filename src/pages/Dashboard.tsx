import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCycle } from '../hooks/useCycle';
import { useCyclePrediction } from '../hooks/useCyclePrediction';
import { useNotifications } from '../hooks/useNotifications';
import { useAppMetaContext } from '../context/AppMetaContext';
import { CycleCard } from '../components/CycleCard';
import { FAB } from '../components/FAB';
import { LogCycleModal } from '../components/LogCycleModal';
import { PageTransition } from '../components/layout/PageTransition';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Activity, Clock, Sparkles, Loader2, CalendarHeart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { cycles, calculations, isLoading, logToday, settings, avgCycleLength, cycleDurations } = useCycle();
  const { prediction, loading: predicting, error: predictionError } = useCyclePrediction(cycleDurations);
  const { userName } = useAppMetaContext();
  const [logModalOpen, setLogModalOpen] = useState(false);

  useNotifications(calculations, settings.notificationsEnabled);

  const todayStr = format(new Date(), "EEEE", { locale: ptBR });

  const hasLoggedToday =
    cycles.length > 0 &&
    Math.abs(new Date(cycles[0].startDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24) <
      settings.periodDuration;

  const greeting = userName && userName !== 'você' ? `Olá, ${userName}!` : 'Olá!';

  return (
    <PageTransition className="pb-28 pt-6 px-6 max-w-md mx-auto min-h-screen">
      <header className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold text-foreground"
          data-testid="text-greeting"
        >
          {greeting}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground capitalize"
        >
          Hoje é {todayStr}
        </motion.p>
      </header>

      <div className="space-y-6">
        <CycleCard calculations={calculations} isLoading={isLoading} />

        {/* ── Registrar ciclo ─────────────────────────────────── */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {hasLoggedToday ? (
              <Card className="bg-primary/5 border-primary/15 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <CalendarHeart className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Ciclo já registrado para este período.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Button
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center gap-3 shadow-sm shadow-primary/20"
                onClick={() => setLogModalOpen(true)}
                data-testid="button-log-cycle-open"
              >
                <CalendarHeart className="w-5 h-5" />
                Quando começou meu ciclo?
              </Button>
            )}
          </motion.div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-card border-border/50 shadow-sm rounded-2xl h-full" data-testid="card-avg-cycle">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">{avgCycleLength}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Dias de ciclo (média)</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-card border-border/50 shadow-sm rounded-2xl h-full" data-testid="card-days-until">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    {calculations ? calculations.daysUntilNextPeriod : '-'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Dias até a próxima</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* ── AI Prediction ────────────────────────────────────── */}
        <AnimatePresence>
          {!isLoading && (prediction !== null || predicting || predictionError) && (
            <motion.div
              key="ai-card"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 20 }}
              data-testid="card-ai-prediction"
            >
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-400 to-blue-400" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-purple-400/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        Previsão Inteligente
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        Modelo treinado no dispositivo
                      </p>
                    </div>
                  </div>

                  {predicting ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Treinando modelo...</span>
                    </div>
                  ) : predictionError ? (
                    <p className="text-sm text-muted-foreground">{predictionError}</p>
                  ) : prediction !== null ? (
                    <div className="flex items-end gap-3">
                      <div>
                        <span
                          className="text-4xl font-bold text-foreground tabular-nums"
                          data-testid="text-ai-prediction-value"
                        >
                          {prediction}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">dias</span>
                      </div>
                      {prediction !== avgCycleLength && (
                        <div className="mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              prediction > avgCycleLength
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}
                          >
                            {prediction > avgCycleLength
                              ? `+${prediction - avgCycleLength}d vs média`
                              : `${prediction - avgCycleLength}d vs média`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground mt-3 leading-snug">
                    Baseado em regressão linear treinada localmente com{' '}
                    {cycleDurations.length} ciclo{cycleDurations.length !== 1 ? 's' : ''} registrado
                    {cycleDurations.length !== 1 ? 's' : ''}. Estimativa, não diagnóstico médico.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Nudge ────────────────────────────────────────────── */}
        <AnimatePresence>
          {!isLoading && cycleDurations.length < 3 && cycleDurations.length > 0 && (
            <motion.div
              key="nudge"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-primary/5 border-primary/15 rounded-2xl" data-testid="card-ai-nudge">
                <CardContent className="p-4 flex gap-3 items-center">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Registre mais {3 - cycleDurations.length} ciclo
                    {3 - cycleDurations.length > 1 ? 's' : ''} para ativar a previsão com IA.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB only shows when no cycle logged today */}
      <FAB show={!isLoading && !hasLoggedToday} onClick={() => setLogModalOpen(true)} />

      {/* Log cycle modal with date picker */}
      <LogCycleModal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onConfirm={(date) => logToday(date)}
      />
    </PageTransition>
  );
}
