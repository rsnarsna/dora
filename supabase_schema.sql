-- Supabase Schema for Personal Management Dashboard
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/uouhcutadbnogggpsuhv/sql)

CREATE TABLE IF NOT EXISTS public.personal_records (
    task_id TEXT PRIMARY KEY,
    nickname TEXT DEFAULT '',
    self_target TEXT DEFAULT '',
    self_priority TEXT DEFAULT 'None',
    notes_log JSONB DEFAULT '[]'::jsonb,
    daily_updates JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) and allow public read/write for personal dashboard
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.personal_records FOR SELECT USING (true);
CREATE POLICY "Allow public write access" ON public.personal_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.personal_records FOR UPDATE USING (true);
