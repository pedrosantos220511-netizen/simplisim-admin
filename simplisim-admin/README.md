# Simplisim Admin

Painel administrativo separado do site público.

## Estrutura
- admin.html
- css/admin.css
- js/admin.js
- js/supabase.js
- sql/admin-setup.sql

## Configuração

1. Abra `js/supabase.js`.
2. Mantenha a URL do projeto e substitua `COLE_SUA_CHAVE_SB_PUBLISHABLE_AQUI` pela sua chave `sb_publishable_...`.
3. Nunca coloque uma chave `sb_secret_...` no navegador.
4. No Supabase, crie um usuário em Authentication > Users.
5. Crie um bucket Storage chamado `produtos` e deixe a leitura pública para que as imagens possam aparecer no site.
6. Abra `sql/admin-setup.sql`, troque `UUID_DO_ADMIN` pelo UUID do usuário e execute no SQL Editor.
7. Rode o painel com um servidor local (por exemplo, Live Server no VS Code).
8. Abra `admin.html`.

O painel usa a tabela `produtos` já existente e não altera o `index.html`.


## Versão aprimorada
Inclui gerenciamento de categorias, renomear/excluir categoria, edição mais segura de imagens e limpeza de arquivos órfãos.
