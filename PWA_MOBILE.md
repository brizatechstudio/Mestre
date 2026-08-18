# MESTRE 1.6.1 — PWA / instalação no celular

O MESTRE agora é uma Progressive Web App (PWA). O mesmo projeto continua funcionando no navegador desktop e mobile, mas também pode ser instalado na tela inicial sem criar um APK separado.

## Arquivos da PWA

```text
public/manifest.webmanifest
public/sw.js
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-maskable-512.png
public/icons/apple-touch-icon.png
src/lib/pwa.ts
```

## O que a PWA faz

- instala o MESTRE como aplicativo;
- abre em janela `standalone`;
- mantém o layout responsivo existente;
- guarda o shell/arquivos estáticos já carregados em cache para melhorar reaberturas;
- não tenta colocar Firestore, autenticação ou Supabase em cache pelo service worker;
- mantém a cópia local de dados que o próprio MESTRE já usa como fallback quando o Firebase fica indisponível.

## Testar responsividade na rede local

```powershell
npm run dev -- --host 0.0.0.0
```

Abra no celular usando o IP do computador. Isso é suficiente para testar layout/câmera, mas a instalação PWA real deve ser testada em **HTTPS**.

## Testar a PWA de verdade

O caminho mais simples é publicar o build em Firebase Hosting:

```powershell
npm run verify
npx firebase-tools login
npx firebase-tools use SEU_FIREBASE_PROJECT_ID
npx firebase-tools deploy --only hosting
```

Abra a URL HTTPS publicada no celular.

### Android / Chrome

Quando o navegador liberar o prompt, o MESTRE mostra um botão de instalação no topo e em **Configurações**. Também é possível usar o menu do Chrome > **Instalar app** / **Adicionar à tela inicial**.

### iPhone / iPad

Abra o MESTRE no Safari e use **Compartilhar > Adicionar à Tela de Início**. O cartão em Configurações também mostra essa orientação quando detecta iOS/iPadOS.

## Atualizações

`public/sw.js` usa um cache versionado (`mestre-1.6.1`). Ao publicar uma versão futura, altere o valor `VERSION` para que os caches antigos sejam removidos na ativação do novo service worker.


## Anúncios na PWA

A PWA continua sendo uma aplicação web instalada. Por isso os banners da versão grátis usam Google Publisher Tag / Google Ad Manager, assim como no navegador. O projeto não integra SDK nativo do AdMob. Usuários MESTRE Pro não recebem banners.
