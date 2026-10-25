import { BookOpen, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { PageTransition } from "../components/layout/PageTransition";
import { Card, CardContent } from "../components/ui/card";

const articles = [
  {
    title: "O ciclo menstrual como sinal vital",
    source: "American College of Obstetricians and Gynecologists (ACOG)",
    summary: "Acompanhar a regularidade, a duração do sangramento e as mudanças ao longo do tempo pode ajudar a reconhecer padrões que merecem uma conversa com um profissional de saúde.",
    url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign"
  },
  {
    title: "Modelos para estimar o início do próximo ciclo",
    source: "Li et al. · Journal of the American Medical Informatics Association · 2021",
    summary: "Estudo sobre previsão da próxima menstruação usando dados de aplicativos e considerando a adesão ao registro. As estimativas dependem da qualidade e da quantidade dos dados pessoais registrados.",
    url: "https://pubmed.ncbi.nlm.nih.gov/34534312/"
  },
  {
    title: "Aplicativos e literacia em saúde menstrual",
    source: "Cunningham et al. · JMIR mHealth and uHealth · 2024",
    summary: "Ensaios-piloto encontraram melhorias em alguns resultados de conhecimento e consciência menstrual entre participantes que usaram o Flo. Isso não significa que todos os aplicativos tenham a mesma eficácia.",
    url: "https://pubmed.ncbi.nlm.nih.gov/38696773/"
  },
  {
    title: "Avaliação clínica e privacidade de apps menstruais",
    source: "Nielsen-Tehranchian et al. · Studies in Health Technology and Informatics · 2023",
    summary: "Avaliação de 18 aplicativos identificou fragilidades em critérios médicos e de privacidade. Minimizar coleta de dados e explicar claramente os cálculos são decisões importantes de projeto.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37697855/"
  }
];

export default function EducationPage() {
  return (
    <PageTransition className="pb-28 pt-6 px-5 sm:px-6 max-w-2xl mx-auto min-h-screen">
      <header className="mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <BookOpen className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Conhecimento menstrual</h1>
        <p className="text-muted-foreground mt-2">Conteúdo educativo com fontes científicas para entender seu ciclo com mais contexto.</p>
      </header>

      <Card className="rounded-2xl border-primary/15 bg-primary/5 mb-5">
        <CardContent className="p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Estimativas, não diagnósticos</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">As datas previstas e a janela fértil são aproximações baseadas em padrões anteriores. Não são método contraceptivo e não confirmam ovulação ou gravidez. A variabilidade individual é real; procure avaliação profissional para dúvidas ou sintomas preocupantes.</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {articles.map((article) => (
          <Card key={article.url} className="rounded-2xl border-border/60">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-primary mb-2">{article.source}</p>
              <h2 className="font-semibold text-foreground leading-snug">{article.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{article.summary}</p>
              <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-primary underline underline-offset-4">
                Consultar publicação <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-muted/60 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">As referências desta página são informativas. Os links externos só abrem quando há conexão; o restante do conteúdo é incluído no aplicativo e fica disponível offline após a instalação/atualização do PWA.</p>
      </div>
    </PageTransition>
  );
}
