# Ativar login e backend na publicação

A versão 1.5.3 é entregue em **prévia local**, sem tela de login, para facilitar os testes antes da publicação e da configuração do Google Ad Manager.

## Agora (prévia local)

```env
VITE_LOGIN_ENABLED=false
VITE_BACKEND_MODE=local
VITE_PREVIEW_PLAN=pro
VITE_BANNER_PREVIEW=true
```

- não mostra a tela de login;
- não inicia Firebase/Firestore;
- mantém PDF e voz livres para teste local;
- mostra o espaço/placeholder de banner em todas as telas internas.

## Quando o site estiver online

No seu `.env`, altere para:

```env
VITE_LOGIN_ENABLED=true
VITE_BACKEND_MODE=firebase
VITE_BANNER_PREVIEW=false
VITE_AUTH_MODE=email
```

Mantenha também as credenciais reais de Firebase/Supabase e, quando estiverem disponíveis, preencha:

```env
VITE_GOOGLE_REWARDED_AD_UNIT_PATH=/SEU_NETWORK_CODE/mestre/rewarded
VITE_GOOGLE_BANNER_AD_UNIT_PATH=/SEU_NETWORK_CODE/mestre/banner
```

Depois execute:

```powershell
npm run doctor
npm run check:ads
npm run verify
```
