# Relatório de performance — MESTRE 1.5.1

## Resultado do build

| Artefato | Antes | Depois |
| --- | ---: | ---: |
| Chunk de entrada principal | 852,49 kB / gzip 250,56 kB | 45,12 kB / gzip 15,07 kB |
| CSS | 46,41 kB | 46,85 kB |
| PDF jsPDF | 417,30 kB | 417,36 kB, sob demanda |
| html2canvas | 199,49 kB | 199,50 kB, sob demanda |

O Firebase permanece em um chunk próprio de 549,02 kB porque autenticação e sincronização são necessárias no início quando o backend Firebase está ativo. React também fica separado em chunk compartilhado de 189,58 kB. Nenhum dos módulos de PDF é pré-carregado no HTML inicial.

## Otimizações entregues

- Telas carregadas com `React.lazy` e `Suspense`: Dashboard, Clientes, Orçamentos, Editor de orçamento, Serviços, Materiais, Custos, Ordens de Serviço, Recibos e Configurações.
- Fallback visual discreto durante a troca de tela, usando os estilos existentes do MESTRE.
- jsPDF, html2canvas, fotos do orçamento, processamento de logo e voz passaram a ficar nos chunks das funcionalidades que os usam.
- Reconhecimento de voz e anúncios premiados passam a carregar somente após a ação do usuário.
- O GPT de banners é iniciado em tempo ocioso, sem disputar o carregamento inicial.
- Firebase, React e páginas têm chunks separados pela configuração Rolldown do Vite.
- Service Worker com atualização imediata, recarregamento controlado da aba em nova versão, limpeza de caches antigos e estratégia network-first para HTML, JS e CSS.
- A PWA não pré-cacheia as duas logos de interface; elas continuam disponíveis por cache de runtime após o primeiro uso.
- Não foram alteradas regras de negócio, autenticação, geração de PDF, armazenamento, responsividade ou aparência da interface.

## Validação

Executados com sucesso: `npm run doctor`, `npm run typecheck`, `npm run build` e `npm audit --omit=dev --audit-level=moderate` (0 vulnerabilidades).
