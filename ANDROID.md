# MESTRE Android 1.6.1

O projeto Android é fornecido pelo Capacitor, que empacota o build React existente em um aplicativo nativo. O identificador padrão é `com.mestre.orcamentos`; troque-o antes de publicar caso já esteja em uso no Google Play.

## Pré-requisitos

- Node 22 ou superior;
- Android Studio 2025.2.1 ou superior;
- Android SDK com ao menos uma plataforma API 24 ou superior.

O Android Studio instala o JDK compatível. Não é necessário usar o Java global para gerar o aplicativo.

## Primeiro uso

```powershell
npm install
npm run android:open
```

O segundo comando abre a pasta `android/` no Android Studio. Conecte um celular Android com depuração USB ou inicie um emulador e use o botão **Run**.

## Fluxo de desenvolvimento

Sempre que alterar a interface React, copie o build para o projeto nativo:

```powershell
npm run android:sync
```

Para compilar e instalar em um aparelho/emulador pela linha de comando:

```powershell
npm run android:run
```

Para gerar um APK de teste, com o SDK Android configurado:

```powershell
npm run android:apk:debug
```

O arquivo gerado fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Publicação no Google Play

No Android Studio, use **Build > Generate Signed Bundle / APK > Android App Bundle**. Crie e guarde o keystore, aumente `versionCode`/`versionName` em `android/app/build.gradle` a cada envio e publique o arquivo `.aab` no Play Console.

## Configuração de produção

Antes de usar login, fotos e upload no APK, inclua `http://localhost` e `capacitor://localhost` em `ALLOWED_ORIGINS` da Edge Function. Em seguida, atualize os segredos e publique a função:

```powershell
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy mestre-storage
```

O app usa o seletor nativo de arquivos para abrir câmera e galeria. O checkout Pro abre no navegador nativo, preservando a sessão do MESTRE.
