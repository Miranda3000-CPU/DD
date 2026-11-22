# Integração Android WebView

## Objetivo

O endereço oficial `https://dd.jeielmiranda.com.br/` é a aplicação principal do DD. O site mantém as telas, navegação, regras de ciclo, validações, armazenamento IndexedDB e experiência PWA. O APK Android é um contêiner WebView para esse mesmo site, com uma ponte restrita para recursos do sistema operacional.

Não existe uma segunda implementação de telas ou regras de negócio no APK. A interface Compose anterior deixa de ser o ponto de entrada, mas os componentes e o banco Room são mantidos durante a transição para permitir migração e rollback.

## Responsabilidades

| Camada | Responsabilidade |
| --- | --- |
| React + Vite | Interface, navegação, cálculos, validações e configurações |
| Dexie + IndexedDB | Dados locais usados pelo site, PWA e WebView |
| Service Worker | Cache de recursos, atualizações e notificações suportadas pelo navegador |
| Android WebView | Exibe o site oficial dentro do APK |
| Ponte Android | Permissões, notificações nativas, alarmes locais e exportação SAF |
| Room legado | Origem dos dados do APK anterior durante a migração |

## Ponte entre Web e Android

A comunicação utiliza `WebViewCompat.addWebMessageListener` (AndroidX WebKit), com objeto JavaScript `window.ddAndroid` e origem permitida exclusivamente `https://dd.jeielmiranda.com.br`. O Android também valida a origem HTTPS e exige mensagem do frame principal.

A ponte não usa `addJavascriptInterface`. As operações são identificadas por ID e respondidas de forma assíncrona. Ações disponíveis:

- `getLegacyData` e `completeLegacyMigration`: migração local única dos dados Room antigos.
- `requestNotificationPermission`: solicita a permissão Android em contexto de ação do usuário.
- `setNotificationsEnabled` e `setDailyReminder`: mantém a configuração web e o agendamento Android coerentes.
- `showNotification`: apresenta uma notificação pelo sistema Android.
- `saveFile`: grava o backup web por meio do Storage Access Framework.

No navegador comum, o site continua usando Notification API, Service Worker e download de arquivo. Não é necessário detectar ou instalar um APK para usar o PWA.

## Migração de dados

Na primeira abertura após a atualização do APK:

1. O Android lê ciclos, registros diários e preferências existentes no Room/SharedPreferences.
2. A WebView importa os dados para o IndexedDB do site, convertendo datas/timestamps.
3. O merge compara datas e `updatedAt`; dados web mais recentes não são substituídos por versões antigas.
4. A migração é marcada como concluída somente após a transação IndexedDB ser confirmada.
5. O banco Room original não é apagado.

A rotina é idempotente: se a importação for interrompida antes da confirmação, a próxima abertura pode repeti-la sem duplicar registros por data.

## Limite de sincronização entre instalações

O IndexedDB do Chrome/PWA e o IndexedDB da WebView do APK pertencem a perfis de armazenamento diferentes. Ambos usam a mesma aplicação e o mesmo modelo de dados, mas **não compartilham automaticamente os registros locais**. O projeto continua sem conta, API de dados ou backend de sincronização.

Para transferir dados entre Chrome, PWA instalado e APK, use o backup criptografado `.ddwebbackup` disponível nas configurações. Sincronização automática entre dispositivos ou entre os dois contêineres exigiria um backend próprio, autenticação e desenho explícito de criptografia/privacidade; isso não faz parte desta integração.

Backups Android antigos `.ddbackup` permanecem arquivos de outro formato e não são convertidos automaticamente. A base Room antiga é preservada no dispositivo como salvaguarda durante a atualização.

## Segurança e comportamento

- O APK carrega apenas HTTPS no domínio oficial dentro da WebView.
- Conteúdo misto, acesso a arquivos locais e acesso direto a conteúdo do dispositivo são desabilitados.
- Links externos são abertos fora do contêiner.
- A ponte aceita somente a origem oficial e o frame principal.
- O APK mantém `allowBackup=false`; a permissão INTERNET é necessária para obter a aplicação web e suas atualizações, não representa sincronização de dados de saúde.
- O lembrete diário usa agendamento Android inexato. O sistema pode entregá-lo com atraso em relação ao horário configurado; não é usado acesso especial a alarmes exatos.

## Verificação de aceite

- Atualizar o APK 5.0 para 6.0 sem desinstalar e conferir a manutenção do mesmo Application ID e assinatura.
- Confirmar que ciclos, registros diários e preferências do Room antigo aparecem no site após a primeira abertura.
- Fechar e abrir novamente: não deve duplicar registros.
- Confirmar que novas gravações feitas no site continuam presentes após reiniciar o APK.
- Testar permissão de notificação concedida, negada e posteriormente habilitada nas configurações do Android.
- Testar o lembrete diário, desativação, reativação e reagendamento após reiniciar o dispositivo.
- Exportar e importar `.ddwebbackup` no Android via seletor de arquivos.
- Validar atualização/offline do PWA separadamente do armazenamento da WebView.
