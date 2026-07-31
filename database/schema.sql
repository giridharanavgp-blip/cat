-- ============================================================
-- CAT - Communication Assessment Tool
-- Supabase / PostgreSQL Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. clinicians
-- Linked 1:1 with Supabase Auth users (auth.users.id)
-- ------------------------------------------------------------
create table if not exists clinicians (
    id uuid primary key default uuid_generate_v4() references auth.users(id) on delete cascade,
    email text unique not null,
    full_name text not null,
    created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. patients
-- ------------------------------------------------------------
create table if not exists patients (
    id uuid primary key default uuid_generate_v4(),
    clinician_id uuid not null references clinicians(id) on delete cascade,
    name text not null,
    age integer check (age >= 0 and age <= 120),
    primary_diagnosis text,
    created_at timestamptz not null default now()
);

create index if not exists idx_patients_clinician on patients(clinician_id);

-- ------------------------------------------------------------
-- 3. behaviors
-- Master list of standardized communication behaviors
-- ------------------------------------------------------------
create table if not exists behaviors (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    category text not null,          -- e.g. 'Articulation', 'Pragmatics', 'Fluency', 'Voice'
    description text,
    teaching_video_url text,         -- Cloudinary hosted URL
    created_at timestamptz not null default now()
);

create index if not exists idx_behaviors_category on behaviors(category);

-- ------------------------------------------------------------
-- 4. assessment_sessions
-- ------------------------------------------------------------
do $$ begin
    if not exists (select 1 from pg_type where typname = 'session_status') then
        create type session_status as enum ('in_progress', 'completed', 'archived');
    end if;
end $$;

create table if not exists assessment_sessions (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid not null references patients(id) on delete cascade,
    clinician_id uuid not null references clinicians(id) on delete cascade,
    status session_status not null default 'in_progress',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_patient on assessment_sessions(patient_id);
create index if not exists idx_sessions_clinician on assessment_sessions(clinician_id);

-- ------------------------------------------------------------
-- 5. assessment_scores
-- ------------------------------------------------------------
do $$ begin
    if not exists (select 1 from pg_type where typname = 'score_status') then
        create type score_status as enum ('Present', 'Absent', 'Not Observed');
    end if;
end $$;

create table if not exists assessment_scores (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid not null references assessment_sessions(id) on delete cascade,
    behavior_id uuid not null references behaviors(id) on delete cascade,
    status score_status not null default 'Not Observed',
    notes text,
    updated_at timestamptz not null default now(),
    unique (session_id, behavior_id)
);

create index if not exists idx_scores_session on assessment_scores(session_id);

-- ------------------------------------------------------------
-- 6. audio_analyses
-- ------------------------------------------------------------
create table if not exists audio_analyses (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid not null references assessment_sessions(id) on delete cascade,
    transcript text,
    tempo_bpm numeric(6,2),          -- speaking rate proxy (beats-per-minute from librosa onset envelope)
    pitch_avg numeric(8,2),          -- average fundamental frequency (Hz)
    pitch_std numeric(8,2),          -- pitch variability
    duration numeric(8,2),           -- seconds
    pause_count integer,
    words_per_minute numeric(6,2),
    audio_url text,                  -- Cloudinary / Supabase Storage URL of original file
    created_at timestamptz not null default now()
);

create index if not exists idx_audio_session on audio_analyses(session_id);

-- ------------------------------------------------------------
-- 7. clinical_reports
-- ------------------------------------------------------------
create table if not exists clinical_reports (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid not null references assessment_sessions(id) on delete cascade,
    report_markdown text not null,
    pdf_url text,
    created_at timestamptz not null default now()
);

create index if not exists idx_reports_session on clinical_reports(session_id);

-- ============================================================
-- Row Level Security (RLS)
-- Clinicians can only see/manage their own patients & sessions
-- ============================================================
alter table clinicians enable row level security;
alter table patients enable row level security;
alter table assessment_sessions enable row level security;
alter table assessment_scores enable row level security;
alter table audio_analyses enable row level security;
alter table clinical_reports enable row level security;
alter table behaviors enable row level security;

-- clinicians policies
drop policy if exists "clinicians_self_select" on clinicians;
create policy "clinicians_self_select" on clinicians
    for select using (auth.uid() = id);

drop policy if exists "clinicians_self_update" on clinicians;
create policy "clinicians_self_update" on clinicians
    for update using (auth.uid() = id);

drop policy if exists "clinicians_self_insert" on clinicians;
create policy "clinicians_self_insert" on clinicians
    for insert with check (auth.uid() = id);

-- patients policies
drop policy if exists "patients_owner_all" on patients;
create policy "patients_owner_all" on patients
    for all using (auth.uid() = clinician_id)
    with check (auth.uid() = clinician_id);

-- behaviors policy
drop policy if exists "behaviors_read_all" on behaviors;
create policy "behaviors_read_all" on behaviors
    for select using (auth.role() = 'authenticated');

-- assessment_sessions policies
drop policy if exists "sessions_owner_all" on assessment_sessions;
create policy "sessions_owner_all" on assessment_sessions
    for all using (auth.uid() = clinician_id)
    with check (auth.uid() = clinician_id);

-- assessment_scores policies
drop policy if exists "scores_owner_all" on assessment_scores;
create policy "scores_owner_all" on assessment_scores
    for all using (
        exists (
            select 1 from assessment_sessions s
            where s.id = assessment_scores.session_id
            and s.clinician_id = auth.uid()
        )
    );

-- audio_analyses policies
drop policy if exists "audio_owner_all" on audio_analyses;
create policy "audio_owner_all" on audio_analyses
    for all using (
        exists (
            select 1 from assessment_sessions s
            where s.id = audio_analyses.session_id
            and s.clinician_id = auth.uid()
        )
    );

-- clinical_reports policies
drop policy if exists "reports_owner_all" on clinical_reports;
create policy "reports_owner_all" on clinical_reports
    for all using (
        exists (
            select 1 from assessment_sessions s
            where s.id = clinical_reports.session_id
            and s.clinician_id = auth.uid()
        )
    );

-- ============================================================
-- Auth User Trigger: Sync auth.users to clinicians table
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.clinicians (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed data: standardized communication behaviors
-- ============================================================
INSERT INTO behaviors (title, category, description) VALUES ('Eye Contact During Conversation', 'Pragmatics', 'Client initiates and maintains appropriate eye contact during conversational turns.');
INSERT INTO behaviors (title, category, description) VALUES ('Turn-Taking in Dialogue', 'Pragmatics', 'Client waits for conversational partner to finish before responding.');
INSERT INTO behaviors (title, category, description) VALUES ('Correct Production of /s/ Sound', 'Articulation', 'Client produces /s/ phoneme correctly in initial, medial, and final word positions.');
INSERT INTO behaviors (title, category, description) VALUES ('Fluent Speech Without Repetitions', 'Fluency', 'Client speaks without part-word or whole-word repetitions exceeding typical disfluency norms.');
INSERT INTO behaviors (title, category, description) VALUES ('Appropriate Vocal Pitch Variation', 'Voice', 'Client demonstrates natural pitch inflection appropriate to age and gender norms.');
INSERT INTO behaviors (title, category, description) VALUES ('Use of Appropriate Sentence Length', 'Language', 'Client produces sentences of age-appropriate mean length of utterance (MLU).');
INSERT INTO behaviors (title, category, description) VALUES ('Requesting Clarification', 'Pragmatics', 'Client appropriately requests clarification when a message is not understood.');
INSERT INTO behaviors (title, category, description) VALUES ('Appropriate Vocal Loudness', 'Voice', 'Client maintains vocal intensity appropriate to context without excessive strain.');


-- Demo Patient Seeding Function for Real-Time Supabase Setup
do $$
declare
  demo_clinician_id uuid;
begin
  select id into demo_clinician_id from auth.users limit 1;
  if demo_clinician_id is not null then
    insert into patients (clinician_id, name, age, primary_diagnosis) values
    (demo_clinician_id, 'Maya Patel', 10, 'Articulation Deficit / Sigmatism'),
    (demo_clinician_id, 'Alex Johnson', 7, 'Speech & Language Delay'),
    (demo_clinician_id, 'Sam Miller', 5, 'Disfluency / Childhood Apraxia of Speech')
    on conflict do nothing;
  end if;
end $$;


