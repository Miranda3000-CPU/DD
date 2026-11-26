import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCycle } from '../hooks/useCycle';
import { calculateCycleForecast } from '../utils/cycleEngine';
import { useNotifications } from '../hooks/useNotifications';
import { CycleAvatar } from '../components/avatar/CycleAvatar';
import { CycleCard } from '../components/CycleCard';
import { FAB } from '../components/FAB';
import { LogCycleModal } from '../components/LogCycleModal';
import { PageTransition } from '../components/layout/PageTransition';
import { Card, CardContent } from '../components/ui/card';
import {
  BottomDialog,
  BottomDialogTitle,
  BottomDialogDescription,
} from '../components/ui/bottom-dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Activity, Clock, Sparkles, CalendarHeart, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const {
    cycles,
    calculations,
    isLoading,
    logToday,
    settings,
    updateSettings,
    avgCycleLength,
    cycleDurations,
  } = useCycle();
  const forecast = calculateCycleForecast(cycles);
  const [logModalOpen, setLogModalOpen] = useState(false);

  const displayName =
    (typeof settings.displayName === 'string' && settings.displayName.trim()) || 'Giovanna';
  const [draftName, setDraftName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  useNotifications(calculations, settings.notificationsEnabled);

  const todayStr = format(new Date(), 'EEEE', { locale: ptBR });

  const hasLoggedToday =
    cycles.length > 0 &&
    Math.abs(new Date(cycles[0].startDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24) <
      settings.periodDuration;

  return (
    <PageTransition className="pb-28 pt-6 px-6 max-w-md mx-auto min-h-screen">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_minmax(0,46%)] items-center gap-1">
        <div className="min-w-0">
          <div className="flex items-center">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="min-w-0 break-words text-2xl font-bold text-foreground"
              data-testid="text-greeting"
            >
              Olá, {displayName}!
            </motion.h1>
            <button
              type="button"
              aria-label="Editar nome"
              title="Editar nome"
              disabled={isLoading}
              onClick={() => setDraftName(displayName)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground capitalize"
          >
            Hoje é {todayStr}
          </motion.p>
        </div>
        <div className="h-52 min-w-0 sm:h-60">
          <CycleAvatar
            currentPhase={calculations?.currentPhase ?? null}
            cycleDay={calculations?.cycleDay ?? null}
          />
        </div>
      </header>
      <BottomDialog
        open={draftName !== null}
        dismissOnBackdrop
        onDismiss={() => {
          if (!savingName) setDraftName(null);
        }}
      >
        <BottomDialogTitle className="text-lg font-semibold">Editar nome</BottomDialogTitle>
        <BottomDialogDescription className="mt-1 text-sm text-muted-foreground">
          Como você quer ser chamada no diário?
        </BottomDialogDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const name = draftName?.trim();
            if (!name || savingName) return;
            setSavingName(true);
            if (await updateSettings({ displayName: name })) setDraftName(null);
            setSavingName(false);
          }}
        >
          <label className="block text-sm font-medium" htmlFor="diary-display-name">
            Nome
          </label>
          <Input
            id="diary-display-name"
            autoComplete="given-name"
            value={draftName ?? ''}
            disabled={savingName}
            onChange={(event) => setDraftName(event.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={savingName}
              onClick={() => setDraftName(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!draftName?.trim() || savingName}>
              Salvar
            </Button>
          </div>
        </form>
      </BottomDialog>

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
              <Card
                className="bg-card border-border/50 shadow-sm rounded-2xl h-full"
                data-testid="card-avg-cycle"
              >
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
              <Card
                className="bg-card border-border/50 shadow-sm rounded-2xl h-full"
                data-testid="card-days-until"
              >
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

        {/* Statistical estimate with visible uncertainty and clinical caveat */}
        {!isLoading && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Sua estimativa de ciclo</h2>
                  <p className="text-xs text-muted-foreground">
                    Cálculo estatístico local, sem IA ou envio de dados
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Próxima menstruação</p>
                  <p className="mt-1 text-sm font-semibold">
                    {forecast.nextPeriod
                      ? format(forecast.nextPeriod, "dd 'de' MMM", { locale: ptBR })
                      : 'Registre um ciclo'}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Janela estimada</p>
                  <p className="mt-1 text-sm font-semibold">
                    {forecast.windowStart && forecast.windowEnd
                      ? `${format(forecast.windowStart, 'dd/MM')} – ${format(forecast.windowEnd, 'dd/MM')}`
                      : 'Indisponível'}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Média histórica</p>
                  <p className="mt-1 text-sm font-semibold">{forecast.averageCycleDays} dias</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Margem estimada</p>
                  <p className="mt-1 text-sm font-semibold">±{forecast.uncertaintyDays} dias</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{forecast.confidence}</p>
              {forecast.attention.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
                  {forecast.attention.map((item) => (
                    <p key={item} className="text-xs leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>
              )}
              {forecast.projections.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Próximos ciclos · 90 dias</h3>
                  {forecast.projections.map((item, index) => (
                    <div
                      key={item.date.toISOString()}
                      className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">Ciclo {index + 1}</span>
                      <span className="text-sm font-medium">{format(item.date, 'dd/MM/yyyy')}</span>
                      <span className="text-xs text-muted-foreground">
                        ±{item.uncertaintyDays} d
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                A previsão é aproximada, não confirma ovulação e não deve ser usada como método
                contraceptivo. Consulte o Guia para entender as limitações e as fontes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Nudge ────────────────────────────────────────────── */}
        <AnimatePresence>
          {!isLoading && cycles.length < 3 && cycles.length > 0 && (
            <motion.div
              key="nudge"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card
                className="bg-primary/5 border-primary/15 rounded-2xl"
                data-testid="card-ai-nudge"
              >
                <CardContent className="p-4 flex gap-3 items-center">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Registre mais {3 - cycles.length} ciclo
                    {3 - cycleDurations.length > 1 ? 's' : ''} para melhorar a estimativa
                    estatística. As previsões continuam aproximadas.
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
