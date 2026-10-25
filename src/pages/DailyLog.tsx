import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PageTransition } from "../components/layout/PageTransition";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { db, DailyLogEntry } from "../services/db";
import { HeartPulse, Save, CalendarDays } from "lucide-react";

const symptomsList = ["Cólicas", "Dor de cabeça", "Inchaço", "Acne", "Sensibilidade mamária", "Cansaço", "Náusea", "Dor lombar", "Diarreia", "Constipação", "Desejo por alimentos", "Alteração de apetite", "Irritabilidade", "Ansiedade", "Tristeza", "Dificuldade de concentração", "Ondas de calor", "Seios doloridos", "Spotting", "Dor pélvica"];

export default function DailyLogPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [flow, setFlow] = useState("");
  const [pain, setPain] = useState("0");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [sleep, setSleep] = useState("");
  const [mucus, setMucus] = useState("");
  const [recentLogs, setRecentLogs] = useState<DailyLogEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    db.dailyLogs.where("date").equals(date).first().then((entry) => {
      if (!active) return;
      setFlow(entry?.flowIntensity ?? "");
      setPain(entry?.painLevel ?? "0");
      setSymptoms(entry?.symptoms ? entry.symptoms.split("|").filter(Boolean) : []);
      setMood(entry?.mood ?? "");
      setEnergy(entry?.energyLevel ?? "");
      setSleep(entry?.sleepQuality ?? "");
      setMucus(entry?.cervicalMucus ?? "");
      setNotes(entry?.notes ?? "");
      setRecentLogs(await db.dailyLogs.orderBy("date").reverse().limit(7).toArray());
    }).catch(() => toast.error("Não foi possível abrir o registro local."));
    return () => { active = false; };
  }, [date]);

  const toggleSymptom = (symptom: string) => setSymptoms(old =>
    old.includes(symptom) ? old.filter(s => s !== symptom) : [...old, symptom]
  );

  const save = async () => {
    setLoading(true);
    try {
      const existing = await db.dailyLogs.where("date").equals(date).first();
      const entry: DailyLogEntry = {
        ...(existing?.id ? { id: existing.id } : {}),
        date, flowIntensity: flow || undefined, painLevel: pain,
        symptoms: symptoms.join("|"), mood: mood || undefined,
        energyLevel: energy || undefined, sleepQuality: sleep || undefined,
        cervicalMucus: mucus || undefined, notes, updatedAt: new Date().toISOString()
      };
      await db.dailyLogs.put(entry);
      setRecentLogs(await db.dailyLogs.orderBy("date").reverse().limit(7).toArray());
      toast.success("Registro diário salvo somente neste dispositivo.");
    } catch {
      toast.error("Não foi possível salvar. Verifique o espaço disponível no dispositivo.");
    } finally { setLoading(false); }
  };

  return <PageTransition className="mx-auto min-h-screen max-w-md space-y-5 px-5 pb-28 pt-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Diário pessoal</p>
      <h1 className="mt-2 text-2xl font-bold">Como você está?</h1>
      <p className="mt-2 text-sm text-muted-foreground">Registre sintomas e bem-estar. Os dados ficam no armazenamento local deste navegador.</p>
    </header>
    <Card className="rounded-3xl shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="space-y-2"><Label htmlFor="log-date"><CalendarDays className="mr-2 inline h-4 w-4"/>Data</Label><Input id="log-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div className="space-y-2"><Label>Fluxo menstrual</Label><div className="grid grid-cols-4 gap-2">{["Nenhum","Leve","Médio","Intenso"].map(v=><Button key={v} type="button" variant={flow===v?"default":"outline"} size="sm" className="rounded-xl px-1" onClick={()=>setFlow(flow===v?"":v)}>{v}</Button>)}</div></div>
        <div className="space-y-2"><Label>Nível de dor (0 a 10)</Label><div className="flex items-center gap-3"><Input type="range" min="0" max="10" value={pain} onChange={e=>setPain(e.target.value)} className="p-0"/><span className="w-6 text-sm font-semibold">{pain}</span></div></div>
        <div className="space-y-2"><Label><HeartPulse className="mr-2 inline h-4 w-4"/>Sintomas</Label><div className="flex flex-wrap gap-2">{symptomsList.map(s=><Button key={s} type="button" variant={symptoms.includes(s)?"default":"outline"} size="sm" className="rounded-full" onClick={()=>toggleSymptom(s)}>{s}</Button>)}</div></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Humor</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" value={mood} onChange={e=>setMood(e.target.value)}><option value="">Não informado</option>{["Bem","Tranquila","Ansiosa","Triste","Irritada","Sensível"].map(v=><option key={v}>{v}</option>)}</select></div>
          <div className="space-y-2"><Label>Energia</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" value={energy} onChange={e=>setEnergy(e.target.value)}><option value="">Não informado</option>{["Baixa","Moderada","Alta"].map(v=><option key={v}>{v}</option>)}</select></div>
          <div className="space-y-2 sm:col-span-2"><Label>Sono</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" value={sleep} onChange={e=>setSleep(e.target.value)}><option value="">Não informado</option>{["Ruim","Regular","Bom","Muito bom"].map(v=><option key={v}>{v}</option>)}</select></div>
        </div>
        <div className="space-y-2"><Label>Muco cervical (opcional)</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" value={mucus} onChange={e=>setMucus(e.target.value)}><option value="">Não informado</option>{["Seco ou ausente","Pegajoso","Cremoso","Aquoso","Transparente e elástico"].map(v=><option key={v}>{v}</option>)}</select><p className="text-xs text-muted-foreground">A observação é pessoal e não confirma ovulação nem fertilidade.</p></div>
        <div className="space-y-2"><Label htmlFor="notes">Anotações pessoais</Label><Textarea id="notes" rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Como foi seu dia? (opcional)"/></div>
        <Button className="w-full rounded-2xl" onClick={save} disabled={loading}><Save className="mr-2 h-4 w-4"/>{loading?"Salvando…":"Salvar registro"}</Button>
      </CardContent>
    </Card>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Registros recentes</h2>
      {recentLogs.length === 0 ? <p className="text-sm text-muted-foreground">Seus registros salvos aparecerão aqui.</p> : recentLogs.map(log => <Card key={log.date} className="rounded-2xl shadow-sm"><CardContent className="flex items-start justify-between gap-3 p-4"><div><p className="text-sm font-semibold">{format(new Date(log.date + "T12:00:00"), "dd 'de' MMMM", {locale: ptBR})}</p><p className="mt-1 text-xs text-muted-foreground">{[log.flowIntensity, log.mood, log.energyLevel].filter(Boolean).join(" · ") || "Sem detalhes resumidos"}</p><p className="mt-1 text-xs text-muted-foreground">{log.symptoms.split("|").filter(Boolean).join(", ")}</p></div><Button size="sm" variant="outline" className="rounded-xl" onClick={()=>setDate(log.date)}>Ver</Button></CardContent></Card>)}
    </section>
  </PageTransition>;
}
