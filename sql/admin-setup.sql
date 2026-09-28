-- CONFIGURAÇÃO DO PAINEL ADMINISTRATIVO
-- 1) Crie um usuário em Supabase > Authentication > Users.
-- 2) Copie o UUID desse usuário e execute o INSERT abaixo.
-- 3) Crie um bucket Storage chamado "produtos" e deixe a leitura pública.
-- 4) Substitua UUID_DO_ADMIN pelo UUID real.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can manage products" on public.produtos;
create policy "Admins can manage products"
on public.produtos for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

insert into public.admin_users (user_id)
values ('UUID_DO_ADMIN')
on conflict do nothing;

-- Storage: bucket "produtos" deve existir.
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'produtos'
  and exists (select 1 from public.admin_users where user_id=auth.uid())
);

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects for update to authenticated
using (
  bucket_id='produtos'
  and exists (select 1 from public.admin_users where user_id=auth.uid())
)
with check (
  bucket_id='produtos'
  and exists (select 1 from public.admin_users where user_id=auth.uid())
);

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (
  bucket_id='produtos'
  and exists (select 1 from public.admin_users where user_id=auth.uid())
);
