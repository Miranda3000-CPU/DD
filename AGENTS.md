# Trabalhar no DD

O Diário Dela é o diário pessoal de Giovanna. Preserve os textos em português, a identidade do aplicativo Android e a compatibilidade com os registros e backups existentes. Use subagentes para uma parte útil da tarefa ou sua revisão quando disponíveis.

- A interface e as regras do diário ficam em `src/`. O projeto Kotlin em `android/` abre a origem HTTPS oficial e implementa as integrações com o sistema.
- Ao alterar a comunicação entre o site e o APK, confira os dois lados do protocolo e acrescente um teste de regressão para o comportamento alterado. O site também funciona em navegador comum.
- Use dados fictícios nos testes. Mantenha registros pessoais, backups reais e chaves de assinatura fora do Git.
- Confira os scripts de qualidade em `package.json` e execute as verificações da GitHub Actions antes de entregar mudanças. No Android, use o Gradle Wrapper do repositório.
- Atualize a página Stack da wiki quando uma mudança afetar a arquitetura, a persistência ou os requisitos de build.
