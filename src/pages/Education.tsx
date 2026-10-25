import { PageTransition } from "../components/layout/PageTransition";
import { Card, CardContent } from "../components/ui/card";
import { BookOpen, ShieldCheck, ExternalLink, Info } from "lucide-react";

const sources = [
  {
    title: "Menstruation in Girls and Adolescents: Using the Menstrual Cycle as a Vital Sign",
    authors: "American College of Obstetricians and Gynecologists (ACOG)",
    detail: "Committee Opinion No. 651. Obstetrics & Gynecology, 2015; reafirmado em 2022.",
    url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign"
  },
  {
    title: "A predictive model for next cycle start date that accounts for adherence in menstrual self-tracking",
    authors: "Li K, Urteaga I, Shea A, et al.",
    detail: "Journal of the American Medical Informatics Association (JAMIA), 2021. PMID: 34534312.",
    url: "https://pubmed.ncbi.nlm.nih.gov/34534312/"
  },
  {
    title: "Characterizing physiological and symptomatic variation in menstrual cycles using self-tracked mobile-health data",
    authors: "Biomedical research using self-tracked cycle data",
    detail: "PubMed PMID: 32509976.",
    url: "https://pubmed.ncbi.nlm.nih.gov/32509976/"
  },
  {
    title: "Menstrual tracking technologies and fertility: evaluating accuracy, utility, and impact on time to pregnancy",
    authors: "Fertility and Sterility, 2026",
    detail: "Referência bibliográfica para leitura crítica sobre limitações de rastreadores de ciclo.",
    url: "https://pubmed.ncbi.nlm.nih.gov/41747954/"
  }
];

export default function EducationPage() {
  return <PageTransition className="mx-auto min-h-screen max-w-md space-y-5 px-5 pb-28 pt-6">
    <header className="mb-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Conhecimento e autocuidado</p>
      <h1 className="mt-2 text-2xl font-bold">Guia do ciclo</h1>
      <p className="mt-2 text-sm text-muted-foreground">Informações educativas baseadas em fontes clínicas e científicas, disponíveis mesmo sem internet.</p>
    </header>
    <Card className="rounded-3xl border-0 bg-primary/5 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 font-semibold"><BookOpen className="h-5 w-5 text-primary"/> Entenda as fases</div>
        <div><p className="font-medium text-sm">Menstruação</p><p className="text-sm text-muted-foreground">Período de sangramento. A duração e o fluxo variam entre pessoas e entre ciclos.</p></div>
        <div><p className="font-medium text-sm">Fase folicular</p><p className="text-sm text-muted-foreground">Começa no primeiro dia da menstruação e segue até a ovulação. Sua duração pode variar.</p></div>
        <div><p className="font-medium text-sm">Ovulação e janela fértil estimadas</p><p className="text-sm text-muted-foreground">Aplicativos estimam essas datas a partir de ciclos anteriores; não confirmam ovulação nem identificam com certeza os dias férteis.</p></div>
        <div><p className="font-medium text-sm">Fase lútea</p><p className="text-sm text-muted-foreground">Fase após a ovulação estimada até a próxima menstruação. Sintomas pré-menstruais não são iguais para todas.</p></div>
      </CardContent>
    </Card>
    <Card className="rounded-3xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary"/> Como interpretar as previsões</div>
        <ul className="space-y-2 pl-5 text-sm text-muted-foreground list-disc">
          <li>Previsões são estimativas estatísticas, não diagnóstico nem certeza clínica.</li>
          <li>Mais registros podem ajudar a descrever o padrão pessoal, mas não eliminam a variabilidade natural.</li>
          <li>Não use previsões de menstruação ou janela fértil como método contraceptivo.</li>
          <li>Procure um profissional de saúde diante de sintomas preocupantes ou mudanças persistentes.</li>
        </ul>
      </CardContent>
    </Card>
    <div className="flex items-start gap-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0"/><p>Este conteúdo foi incluído no aplicativo para consulta offline. Os links só abrirão quando houver conexão.</p>
    </div>
    <h2 className="px-1 text-lg font-bold">Referências acadêmicas</h2>
    {sources.map((source) => <Card key={source.url} className="rounded-2xl shadow-sm">
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-semibold leading-snug">{source.title}</p>
        <p className="text-xs text-muted-foreground">{source.authors}</p>
        <p className="text-xs text-muted-foreground">{source.detail}</p>
        <a className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noreferrer">Consultar fonte <ExternalLink className="h-3 w-3"/></a>
      </CardContent>
    </Card>)}
  </PageTransition>;
}
