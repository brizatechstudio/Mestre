# Auditoria de fechamento — MESTRE 1.0.0

## Resultado

A arquitetura está consistente para o release 1.0 com Firebase Authentication + Firestore e Supabase Storage.

## Correções realizadas no fechamento

1. **Firebase Project ID da Edge Function**
   - Havia divergência entre o projeto Firebase do frontend e `FIREBASE_PROJECT_ID` da função Supabase.
   - Corrigido para usar o mesmo Project ID.

2. **Configuração Supabase do frontend**
   - O `.env` principal estava sem a publishable key e com URL incompleta/placeholder, enquanto os valores corretos estavam no arquivo de exemplo do projeto recebido.
   - A configuração local foi reconciliada.

3. **CORS da Edge Function**
   - Antes, ausência de `ALLOWED_ORIGINS` permitia qualquer origem.
   - Agora a função falha fechada: requisições de navegador só passam se a origem estiver explicitamente cadastrada.

4. **Chave privilegiada Supabase**
   - A função suporta tanto a variável legada `SUPABASE_SERVICE_ROLE_KEY` quanto o formato atual `SUPABASE_SECRET_KEYS` fornecido pelo ambiente Supabase.
   - Nenhuma chave privilegiada é exposta em `VITE_*`.

5. **Entitlements / plano**
   - Criado `entitlements/{uid}`.
   - Usuário pode ler o próprio plano, mas não pode criar/editar/excluir o entitlement pelo frontend.
   - Ausência do documento = plano grátis.

6. **Premium gates**
   - Todos os botões de microfone passam pelo mesmo gate de voz.
   - Exportação PDF passa pelo gate de PDF.
   - Pro ignora anúncios.
   - Grátis exige recompensa de anúncio para cada ação.

7. **PDF**
   - Continua em lazy loading, separado do bundle principal.

## Itens externos ainda necessários para monetização real

- Criar/configurar a unidade Rewarded no Google Ad Manager.
- Definir `VITE_GOOGLE_REWARDED_AD_UNIT_PATH`.
- Escolher/configurar o checkout Pro.
- Automatizar `entitlements/{uid}` por webhook quando o meio de pagamento for definido.
- Configurar política de privacidade/consentimento de anúncios aplicável ao público e regiões atendidas.

Esses itens dependem de contas/credenciais externas e não podem ser inventados pelo código do projeto.

## Validação local incluída

`npm run doctor` verifica a consistência dos arquivos de ambiente sem imprimir credenciais.

## Endurecimento adicional do fechamento

8. **Troca de contas**
   - O entitlement é resetado para Grátis assim que muda o usuário autenticado e só volta a Pro depois da leitura do documento da conta atual.

9. **Expiração Pro**
   - Quando `proUntil` existe, uma data expirada ou inválida não concede acesso Pro.

10. **Doctor ampliado**
   - O diagnóstico bloqueia configurações em que uma chave Supabase privilegiada apareça em `VITE_*` e confere os principais campos de Firebase, Supabase, CORS e bucket sem imprimir credenciais.
