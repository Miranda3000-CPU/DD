import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCycle } from '../hooks/useCycle';
import { useCyclePrediction } from '../hooks/useCyclePrediction';
import { PageTransition } from '../components/layout/PageTransition';
import { HistoryList } from '../components/HistoryList';
import { SearchBar } from '../components/SearchBar';
import { CycleChart } from '../components/CycleChart';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowDownAZ, ArrowUpAZ, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

type SortOrder = 'desc' | 'asc';

export default function HistoryPage() {
  const { cycles, deleteEntry, isLoading, cycleDurations, avgCycleLength } = useCycle();
  const { prediction, loading: predicting } = useCyclePrediction(cycleDurations);

  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = [...cycles].sort((a, b) => {
      const diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });
    if (!q) return base;
    return base.filter((c) => {
      const label = format(parseISO(c.startDate), 'MMMM yyyy', { locale: ptBR }).toLowerCase();
      return label.includes(q) || c.startDate.includes(q);
    });
  }, [cycles, query, sortOrder]);

  return (
    <PageTransition className="pb-24 pt-6 px-6 max-w-md mx-auto min-h-screen">
      <header className="mb-6">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          Histórico
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          Seus registros anteriores
        </motion.p>
      </header>

      {/* Chart — shown when at least 2 cycles exist (1 duration point) */}
      {!isLoading && cycles.length >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <CycleChart
            cycles={cycles}
            avgCycleLength={avgCycleLength}
            prediction={prediction}
            predicting={predicting}
          />
        </motion.div>
      ) : !isLoading && cycles.length === 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-6">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                Registre mais <strong className="text-foreground">1 ciclo</strong> para ver o
                gráfico de evolução.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Search + sort controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 mb-4"
      >
        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por mês ou ano..."
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-2xl border-border/60 shrink-0"
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          title={sortOrder === 'desc' ? 'Mais recente primeiro' : 'Mais antigo primeiro'}
          data-testid="button-sort-toggle"
        >
          {sortOrder === 'desc' ? (
            <ArrowDownAZ className="w-4 h-4" />
          ) : (
            <ArrowUpAZ className="w-4 h-4" />
          )}
        </Button>
      </motion.div>

      <HistoryList cycles={filtered} onDelete={deleteEntry} isLoading={isLoading} />
    </PageTransition>
  );
}
