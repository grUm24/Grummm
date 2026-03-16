alter table if exists project_posts
    add column if not exists kind text;

alter table if exists project_posts
    add column if not exists content_blocks jsonb not null default '[]'::jsonb;

update project_posts
set kind = case
    when template <> 0 or frontend_path is not null or backend_path is not null then 'project'
    else 'post'
end
where kind is null or btrim(kind) = '';

update project_posts
set content_blocks = '[]'::jsonb
where content_blocks is null;

alter table if exists project_posts
    alter column kind set default 'post';

alter table if exists project_posts
    alter column kind set not null;