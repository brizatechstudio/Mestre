-- MESTRE 1.4.0 — Supabase Storage
-- Execute este arquivo inteiro no SQL Editor do Supabase.
--
-- Arquitetura:
--   mestre-public-assets  -> logo profissional (leitura pública pela URL)
--   mestre-private-media  -> fotos dos orçamentos (privadas; acesso por signed URL)
--
-- Upload, remoção e geração de signed URL são executados SOMENTE pela
-- Edge Function `mestre-storage`, usando a secret key do ambiente do Supabase.
-- O frontend nunca recebe service_role/sb_secret_.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mestre-public-assets',
  'mestre-public-assets',
  true,
  3145728,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mestre-private-media',
  'mestre-private-media',
  false,
  3145728,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Não são criadas policies de INSERT/UPDATE/DELETE para anon/authenticated.
-- Dessa forma, o navegador não pode gravar diretamente nos buckets.
-- A Edge Function usa uma secret key de servidor, que bypassa RLS para as
-- operações administrativas autorizadas depois de validar o ID token Firebase.
