import { useCycle } from '../hooks/useCycle';
import { useAppMetaContext } from '../context/AppMetaContext';
import { PageTransition } from '../components/layout/PageTransition';
import { CalendarView } from '../components/CalendarView';
import { CycleAvatar } from '../components/avatar/CycleAvatar';
import { CalendarTour } from '../components/CalendarTour';
import { motion } from 'framer-motion';

export default function CalendarPage() {
  const { cycles, settings, calculations, isLoading } = useCycle();
  const { privacySeen, calendarTourSeen, acknowledgeCalendarTour } = useAppMetaContext();

  return (
    <PageTransition className="pb-24 pt-6 px-6 max-w-md mx-auto min-h-screen">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_minmax(0,46%)] items-center gap-1">
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            Calendário
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Acompanhe seus dias
          </motion.p>
        </div>
        <div className="h-52 min-w-0 sm:h-60">
          <CycleAvatar
            currentPhase={calculations?.currentPhase ?? null}
            cycleDay={calculations?.cycleDay ?? null}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="w-full h-[400px] rounded-3xl bg-muted/50 animate-pulse" />
      ) : (
        <>
          <CalendarView cycles={cycles} settings={settings} />

          {/* One-time color legend tour — shown below the calendar */}
          <CalendarTour
            visible={privacySeen && !calendarTourSeen}
            onDismiss={acknowledgeCalendarTour}
          />
        </>
      )}
    </PageTransition>
  );
}
