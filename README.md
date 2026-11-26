# Diário Dela

Diário de ciclo e bem-estar que Jeiel desenvolveu para sua noiva, Giovanna. O site e o aplicativo Android compartilham a interface e guardam os registros no dispositivo. As previsões de ciclo são estimativas educativas.

[Abrir o diário](https://dd.jeielmiranda.com.br) · [Documentação e stack](https://github.com/Miranda3000-CPU/DD/wiki) · [Baixar artefatos de uma execução do GitHub Actions](https://github.com/Miranda3000-CPU/DD/actions/workflows/ci.yml)

## Desenvolvimento

Na raiz, execute `pnpm install --frozen-lockfile` e `pnpm dev` para iniciar o site. Use `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` para validá-lo.

Em `android/`, execute `./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug` para validar o aplicativo Kotlin e gerar o APK em `app/build/outputs/apk/debug/`.

A [integração Android](https://github.com/Miranda3000-CPU/DD/wiki/ANDROID-WEBVIEW) descreve notificações, arquivos e migração dos dados antigos. Para testar o site sem conexão após a primeira abertura, siga o [roteiro de validação offline](https://github.com/Miranda3000-CPU/DD/wiki/OFFLINE-VALIDATION).
