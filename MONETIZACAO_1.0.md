# Monetização — MESTRE 1.0

## Regra de produto

O plano **Grátis** não limita a quantidade de orçamentos. A monetização ocorre nos recursos de produtividade:

- Voz: anúncio premiado por sessão no plano grátis.
- PDF: anúncio premiado por exportação no plano grátis.
- Banner: exibido nas telas internas para usuários do plano grátis.
- Pro: voz e PDF sem anúncios e sem banners.

## Google Rewarded Ads

Configure no `.env`:

```env
VITE_GOOGLE_REWARDED_AD_UNIT_PATH=/SEU_NETWORK_CODE/SEU_AD_UNIT
```

A integração usa Google Publisher Tag (GPT) e os eventos de anúncio recompensado. O recurso só é liberado quando ocorre o evento de recompensa. Fechar o anúncio antes da recompensa mantém o recurso bloqueado.

Se a unidade não estiver configurada, não houver preenchimento de anúncio ou o dispositivo não suportar o formato, o sistema informa que o anúncio está indisponível e não libera a ação.

## Plano Pro

O frontend acompanha em tempo real:

```text
entitlements/{firebaseUid}
```

Formato mínimo:

```json
{
  "plan": "pro",
  "source": "manual"
}
```

As regras de segurança impedem que o próprio usuário altere esse documento pelo SDK web.

## Checkout

Configure opcionalmente:

```env
VITE_PRO_CHECKOUT_URL=https://seu-checkout.example/assinar
```

A versão 1.0 abre esse link pelo botão “Conhecer Pro”. A ativação automática após pagamento depende do provedor escolhido e deve ser feita por webhook confiável/rotina administrativa, nunca pelo navegador.

## Limitação de segurança da monetização

Voz e PDF são funções executadas no navegador. Portanto, a barreira comercial é adequada para usuários normais, mas não é DRM forte contra alguém que modifique o JavaScript localmente. Para proteção comercial rígida no futuro, mova a geração do PDF ou a validação do benefício para um backend que exija um entitlement/reward verificável no servidor.


## Banner web

Configure também:

```env
VITE_GOOGLE_BANNER_AD_UNIT_PATH=/SEU_NETWORK_CODE/MESTRE/BANNER
```

O banner é responsivo e aparece no topo das telas internas somente para o plano grátis. A implementação usa Google Publisher Tag (GPT) / Google Ad Manager. Consulte `ANUNCIOS_WEB.md`.
