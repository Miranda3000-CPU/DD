import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Save } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "../components/layout/PageTransition";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { db, type DailyLogEntry } from "../services/db";

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const choices = {
  flowIntensity: ["Nenhum", "Leve", "Médio", "Intenso"],
  painLevel: ["Nenhuma", "Leve", "Moderada", "Intensa"],
  mood: ["Bem", "Tranquila", "Sensível", "Ansiosa", "Triste", "Irritada"],
  energyLevel: ["Baixa", "Média", "Alta"],
  sleepQuality: ["Ruim", "Regular", "Boa", "Ótima"],
  cervicalMucus: ["Não observei", "Seco", "Pegajoso", "Cremoso", "Aquoso", "Elástico"]
} as const;

function ChoiceField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-h-11 border border-input rounded-xl px-3 py-2 bg-background text-foreground">
        <option value="">Não informar</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

export default function DailyLogPage() {
  const [date, setDate] = useState(todayIso());
  const [form, setForm] = useState<Omit<DailyLogEntry, "id" | "date" | "uuid" | "createdAt" | "updatedAt">>({
    flowIntensity: "", painLevel: "", symptoms: "", mood: "", energyLevel: "", sleepQuality: "", cervicalMucus: "", notes: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    db.dailyLogs.where("date").equals(date).first().then((record) => {
      if (!active) return;
      setForm({
        flowIntensity: record?.flowIntensity ?? "", painLevel: record?.painLevel ?? "",
        symptoms: record?.symptoms ?? "", mood: record?.mood ?? "",
        energyLevel: record?.energyLevel ?? "", sleepQuality: record?.sleepQuality ?? "",
        cervicalMucus: record?.cervicalMucus ?? "", notes: record?.notes ?? ""
      });
    }).catch(() => toast.error("Não foi possível carregar o registro local."));
    return () => { active = false; };
  }, [date]);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setLoading(true);
    try {
      const existing = await db.dailyLogs.where("date").equals(date).first();
      const now = new Date().toISOString();
      await db.dailyLogs.put({
        ...existing,
        ...form,
        date,
        uuid: existing?.uuid ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      });
      toast.success("Registro diário salvo neste dispositivo.");
    } catch {
      toast.error("Não foi possível salvar. Verifique o espaço disponível no dispositivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="pb-28 pt-6 px-5 sm:px-6 max-w-xl mx-auto min-h-screen">
      <header className="mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4"><Activity className="w-6 h-6" /></div>
        <h1 className="text-2xl font-bold">Diário diário</h1>
        <p className="text-muted-foreground mt-2">Registre como você está se sentindo. Os dados ficam no armazenamento local deste navegador.</p>
      </header>

      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="log-date">Data do registro</Label>
            <Input id="log-date" type="date" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value)} />
            <p className="text-xs text-muted-foreground">{format(new Date(date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChoiceField label="Fluxo menstrual" value={form.flowIntensity ?? ""} options={choices.flowIntensity} onChange={(v) => set("flowIntensity", v)} />
            <ChoiceField label="Dor ou cólica" value={form.painLevel ?? ""} options={choices.painLevel} onChange={(v) => set("painLevel", v)} />
            <ChoiceField label="Humor" value={form.mood ?? ""} options={choices.mood} onChange={(v) => set("mood", v)} />
            <ChoiceField label="Energia" value={form.energyLevel ?? ""} options={choices.energyLevel} onChange={(v) => set("energyLevel", v)} />
            <ChoiceField label="Qualidade do sono" value={form.sleepQuality ?? ""} options={choices.sleepQuality} onChange={(v) => set("sleepQuality", v)} />
            <ChoiceField label="Muco cervical (opcional)" value={form.cervicalMucus ?? ""} options={choices.cervicalMucus} onChange={(v) => set("cervicalMucus", v)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-symptoms">Sintomas</Label>
            <Input id="log-symptoms" value={form.symptoms ?? ""} onChange={(event) => set("symptoms", event.target.value)} placeholder="Ex.: inchaço, dor de cabeça..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="log-notes">Observações pessoais</Label>
            <Textarea id="log-notes" value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} placeholder="Anotações opcionais..." rows={3} />
          </div>
          <Button className="w-full rounded-xl" onClick={save} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />{loading ? "Salvando..." : "Salvar registro"}
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground leading-relaxed mt-4">Este diário não diagnostica condições de saúde. Registros de sintomas podem ajudar você a conversar com um profissional, se desejar.</p>
    </PageTransition>
  );
}
