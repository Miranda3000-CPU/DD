# DD Web: validação de funcionamento offline

## O que o app foi projetado para fazer sem rede

- Abrir a aplicação após a primeira visita online e o service worker terminar de instalar o cache.
- Ler e gravar ciclos, configurações e registros diários no IndexedDB local.
- Calcular estimativas do ciclo no dispositivo.
- Consultar o guia educativo e as referências que estão incluídas no bundle.
- Exportar e importar backup criptografado localmente, usando Web Crypto (PBKDF2 + AES-GCM).

## Limites importantes

- A primeira abertura/instalação requer conexão e origem segura (HTTPS ou localhost) para baixar os arquivos e instalar o service worker.
- Links externos para artigos científicos só abrem com conexão.
- Notificações em PWA dependem do navegador, permissões e políticas do sistema operacional; não são garantidas em segundo plano em todos os dispositivos.
- O backup web `.ddwebbackup` é distinto do backup Android `.ddbackup`. Não importar um formato no outro.
- Os dados IndexedDB são locais ao perfil/navegador. Limpar dados do site pode apagá-los; exporte backups regularmente.
- Nenhuma previsão de ciclo ou janela fértil é confirmação clínica ou método contraceptivo.

## Checklist manual em Android/Chrome

1. Publique a build em HTTPS.
2. Abra o app online e aguarde a instalação/atualização do service worker.
3. Registre um ciclo e um registro diário com sintomas, humor e notas.
4. Feche e reabra o app; confirme que os registros continuam presentes.
5. Ative modo avião e reabra o app a partir do ícone instalado.
6. Confirme que Dashboard, Calendário, Diário, Histórico, Guia e Ajustes abrem.
7. Crie backup com senha de pelo menos 10 caracteres.
8. Apague apenas dados de teste e importe o backup; confira que os registros retornam sem apagar registros locais já existentes.
9. Teste senha incorreta e arquivo alterado; a importação deve falhar sem aplicar dados.
10. Desative modo avião e confirme que os links de referência abrem.

## Verificação automatizada

O workflow `.github/workflows/ci.yml` executa `pnpm install --frozen-lockfile`, `pnpm typecheck` e `pnpm build` em pull requests. A execução de CI é a validação de compilação; o checklist de modo avião ainda exige teste real no navegador/dispositivo.
