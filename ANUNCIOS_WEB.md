# MESTRE 1.5.3 — anúncios web

O MESTRE usa **Google Ad Manager / Google Publisher Tag (GPT)** para os anúncios da versão web/PWA.

## Formatos

- **Banner responsivo:** exibido no topo das telas internas do plano MESTRE Grátis.
- **Rewarded:** usado para liberar ações premium pontuais (voz e PDF) no plano grátis.
- **MESTRE Pro:** não exibe banner e não exige anúncio para voz/PDF.

## Variáveis do frontend

```env
VITE_GOOGLE_REWARDED_AD_UNIT_PATH=
VITE_GOOGLE_BANNER_AD_UNIT_PATH=
VITE_BANNER_PREVIEW=true
```

Use os caminhos das unidades criadas no Google Ad Manager. Não coloque credenciais privadas no frontend.

Exemplo de formato de caminho de unidade do Ad Manager:

```text
/SEU_NETWORK_CODE/mestre/banner
```

## Banner responsivo

O banner aceita automaticamente tamanhos adequados ao viewport:

- desktop: 970x90 ou 728x90
- tablet: 728x90 ou 468x60
- mobile/PWA: 320x100 ou 320x50

A área fica reservada para reduzir mudanças bruscas de layout. Em navegação entre telas do SPA, o slot anterior é destruído e um novo é criado com o targeting `mestre_screen` correspondente à tela atual.

## Importante

O MESTRE não faz refresh automático por cronômetro. Cada carregamento/troca de tela cria a solicitação apropriada. Caso refresh automático seja adicionado futuramente, ele deve ser configurado e declarado de acordo com as políticas do Google Ad Manager.

Enquanto `VITE_GOOGLE_BANNER_AD_UNIT_PATH` estiver vazio, usuários grátis verão apenas um placeholder discreto de "Espaço publicitário" para facilitar os testes de layout.


## Prévia antes do Google Ad Manager

Enquanto o site ainda não estiver publicado, mantenha:

```env
VITE_LOGIN_ENABLED=false
VITE_BACKEND_MODE=local
VITE_PREVIEW_PLAN=pro
VITE_GOOGLE_REWARDED_AD_UNIT_PATH=
VITE_GOOGLE_BANNER_AD_UNIT_PATH=
VITE_BANNER_PREVIEW=true
```

Nesse modo a tela de login não aparece, nenhum acesso ao Firestore é iniciado e `VITE_BANNER_PREVIEW=true` mostra um placeholder em todas as telas internas. O plano local fica Pro para você continuar testando PDF e voz sem depender de rewarded real. Antes de publicar, altere `VITE_BANNER_PREVIEW=false`.

Para verificar a integração estrutural execute:

```powershell
npm run check:ads
```

Quando o site estiver online e as unidades do Google Ad Manager existirem, preencha os dois caminhos de unidade. O banner passa a usar GPT real; se a solicitação não tiver preenchimento, o MESTRE mantém o espaço identificado em vez de deixar uma área vazia.
