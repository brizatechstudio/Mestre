# Alterações 1.5.0

## Banner de anúncios nas telas

- Adicionado banner responsivo nas telas internas do MESTRE Grátis.
- O MESTRE Pro continua sem banners.
- Integração baseada em Google Ad Manager / Google Publisher Tag (GPT), a mesma tecnologia já usada pelo anúncio premiado.
- Um único caminho de unidade de banner pode atender todas as telas; o sistema envia `mestre_screen` como targeting para identificar a tela atual.
- Tamanhos responsivos para desktop, tablet e celular/PWA.
- Placeholder visual enquanto a unidade real ainda não estiver configurada.
- Nenhum refresh automático agressivo foi adicionado.
- Nova variável `VITE_GOOGLE_BANNER_AD_UNIT_PATH`.
- `npm run doctor` atualizado para verificar também a configuração do banner.
