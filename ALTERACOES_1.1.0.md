# MESTRE 1.1.0 — Fotos no orçamento

## Novo recurso

O orçamento agora aceita até **6 fotos** do local, equipamento ou item que será atendido.

- botão **Tirar foto** abre a câmera traseira em celulares compatíveis;
- botão **Galeria** permite escolher imagens já existentes;
- fotos são comprimidas automaticamente antes do upload;
- cada foto pode receber uma legenda opcional;
- fotos aparecem no PDF em uma seção visual própria;
- quantidade de fotos aparece na listagem e no resumo do orçamento;
- ao excluir uma foto ou o orçamento, os arquivos correspondentes são removidos do Storage;
- ao duplicar um orçamento, as fotos não são compartilhadas com a cópia, evitando referências quebradas.

## Privacidade e Supabase

As fotos de orçamento não usam bucket público. Foi adicionado o bucket privado:

```text
mestre-private-media
```

Os arquivos ficam em:

```text
quote-photos/{firebaseUid}/{quoteId}/{photoId}.jpg
```

O navegador nunca recebe acesso permanente ao bucket. A Edge Function valida o ID token do Firebase e entrega somente **URLs assinadas temporárias** para visualização. Na exportação, o MESTRE obtém uma cópia temporária da foto e a incorpora diretamente no PDF.

A logo profissional continua no bucket público `mestre-public-assets`.

## Compatibilidade

Orçamentos criados nas versões anteriores continuam funcionando. O campo `photos` é opcional e, quando ausente, é tratado como lista vazia.
