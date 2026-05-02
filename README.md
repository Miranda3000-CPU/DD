# Ciclo - Acompanhamento Menstrual Privado

O **Ciclo** é um aplicativo web progressivo (PWA) projetado para ajudar no acompanhamento do ciclo menstrual com foco absoluto em privacidade e autonomia do usuário. Diferente de outras soluções, o Ciclo não possui servidores: todos os seus dados permanecem exclusivamente no seu dispositivo.

## 🛡️ Privacidade em Primeiro Lugar

A filosofia central do projeto é que seus dados de saúde são íntimos e pertencem apenas a você.
- **Armazenamento Local:** Utiliza IndexedDB (via Dexie.js) para salvar informações diretamente no navegador.
- **Sem Nuvem:** Não há coleta de dados, contas ou sincronização com servidores externos.
- **Transparência:** O código é focado em processamento *client-side*.

## ✨ Funcionalidades

- **Dashboard Inteligente:** Visualização clara do status atual do ciclo e dias restantes para o próximo período.
- **Previsão com IA:** Utiliza um modelo de regressão linear treinado localmente no dispositivo para prever a duração dos próximos ciclos com base no seu histórico.
- **PWA (Progressive Web App):** Pode ser instalado no Android (via Chrome) e iOS (via Safari), funcionando perfeitamente sem conexão com a internet.
- **Notificações:** Sistema de lembretes diários para manter o acompanhamento em dia.
- **Histórico e Calendário:** Gestão completa de registros passados com opção de exclusão e edição.
- **Interface Adaptável:** Suporte a modo claro (Light) e escuro (Dark) com animações fluidas usando Framer Motion.

## 🚀 Tecnologias Utilizadas

O projeto foi construído com o que há de mais moderno no ecossistema web:

- **Framework:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** Radix UI + Lucide React
- **Animações:** [Framer Motion](https://www.framer.com/motion/)
- **Banco de Dados:** [Dexie.js](https://dexie.org/) (IndexedDB)
- **PWA:** [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- **IA/Matemática:** Regressão linear simples para predições no dispositivo.

## 📦 Instalação e Desenvolvimento

Para rodar o projeto localmente:

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/ciclo.git
   ```
2. Instale as dependências:
   ```bash
   pnpm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```
4. Para build de produção (gerar PWA):
   ```bash
   pnpm build
   ```

## ✒️ Autor

Desenvolvido por **Jeiel Miranda**. Conheça mais em [jeielmiranda.com.br](https://jeielmiranda.com.br).

---
*Este projeto foi desenvolvido com foco em acessibilidade e performance, garantindo uma experiência nativa diretamente no navegador.*