-- TASK-10.5 baseline migration (ProjectPosts template metadata)
-- Apply only when persistent PostgreSQL table `project_posts` is in use.

ALTER TABLE IF EXISTS project_posts
    ADD COLUMN IF NOT EXISTS template smallint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS frontend_path text NULL,
    ADD COLUMN IF NOT EXISTS backend_path text NULL;

COMMENT ON COLUMN project_posts.template IS
    'TemplateType enum: 0=None, 1=Static, 2=CSharp, 3=Python, 4=JavaScript';
