import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CycleEntry } from '../services/db';
import { Card, CardContent } from './ui/card';
import { Sparkles, TrendingUp } from 'lucide-react';

interface CycleChartProps {
  cycles: CycleEntry[];
  avgCycleLength: number;
  prediction: number | null;
  predicting: boolean;
}

interface ChartPoint {
  label: string;
  dias: number;
}

export function CycleChart({ cycles, avgCycleLength, prediction, predicting }: CycleChartProps) {
  const sorted = [...cycles].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const data: ChartPoint[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = differenceInDays(
      parseISO(sorted[i + 1].startDate),
      parseISO(sorted[i].startDate)
    );
    // Relaxed range: 14–90 days covers all realistic cycle lengths
    if (diff >= 14 && diff <= 90) {
      data.push({
        label: format(parseISO(sorted[i].startDate), 'MMM/yy', { locale: ptBR }),
        dias: diff,
      });
    }
  }

  if (data.length < 1) return null;

  return (
    <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Duração dos ciclos</span>
          </div>
          {prediction !== null && (
            <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>IA: {prediction}d</span>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 3', 'dataMax + 3']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: number) => [`${value} dias`, 'Ciclo']}
              labelFormatter={(label) => label}
            />

            <ReferenceLine
              y={avgCycleLength}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Média: ${avgCycleLength}d`,
                position: 'insideTopRight',
                fontSize: 9,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />

            {prediction !== null && (
              <ReferenceLine
                y={prediction}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `IA: ${prediction}d`,
                  position: 'insideBottomRight',
                  fontSize: 9,
                  fill: 'hsl(var(--primary))',
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="dias"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-5 border-t border-dashed border-muted-foreground" />
            Média histórica
          </div>
          {prediction !== null && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <div className="w-5 border-t border-dashed border-primary" />
              Previsão IA
            </div>
          )}
          {predicting && (
            <div className="text-xs text-muted-foreground animate-pulse">
              Treinando modelo...
            </div>
          )}
        </div>

        {prediction !== null && prediction !== avgCycleLength && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground leading-snug">
              O modelo de IA prevê um ciclo de{' '}
              <strong className="text-foreground">{prediction} dias</strong>, enquanto sua média
              histórica é de <strong className="text-foreground">{avgCycleLength} dias</strong> —
              diferença de{' '}
              <span className={prediction > avgCycleLength ? 'text-blue-500' : 'text-primary font-medium'}>
                {prediction > avgCycleLength ? '+' : ''}
                {prediction - avgCycleLength} dias
              </span>
              .
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
