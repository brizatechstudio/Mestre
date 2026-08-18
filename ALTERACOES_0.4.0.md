# Alterações 0.4.0

## Logo garantida no PDF

A geração do PDF agora prepara a logo em um formato JPEG compatível antes de inseri-la no documento. Isso corrige casos em que a logo aparecia nas Configurações, mas não era renderizada pelo jsPDF.

Também foi melhorado o processamento no upload:

- redução automática de tamanho;
- remoção de margens brancas/transparentes excessivas;
- otimização para evitar limite de armazenamento do navegador;
- compatibilidade com PNG, JPG e WebP.

## Identidade visual automática

Antes de gerar cada PDF, o MESTRE analisa os pixels da logo e identifica automaticamente suas cores predominantes.

A paleta detectada é aplicada em:

- cabeçalho;
- faixa lateral;
- cartões "De" e "Para";
- títulos de Serviços e Materiais;
- tabelas;
- resumo financeiro;
- destaque do valor total;
- detalhes e linhas do documento.

Assim, uma logo azul gera um PDF azul, uma logo vermelha gera um PDF vermelho, uma logo verde gera um PDF verde, e assim por diante.

Se não houver logo cadastrada, o sistema mantém a identidade azul/ciano padrão do MESTRE.

## Importante

Depois de atualizar para esta versão, abra **Configurações**, selecione novamente a logo, clique em **Salvar alterações** e então gere um novo PDF. Isso garante que logos antigas também passem pelo novo processo de otimização.
