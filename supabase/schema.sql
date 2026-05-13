-- BreedBase 전체 스키마 + 공개 접근 설정
-- Supabase → SQL Editor → 전체 붙여넣기 → Run

-- 1. Enums
create type cage_type       as enum ('mating','male','female','holding');
create type mouse_sex       as enum ('M','F');
create type mouse_status    as enum ('생존','mating중','실험중','안락사','폐사');
create type genotype_result as enum ('WT','Het','Homo','Unknown');
create type mouse_line      as enum ('KO','KI','Cre');

-- 2. Cages
create table cages (
  id         uuid primary key default gen_random_uuid(),
  num        text not null,
  type       cage_type not null default 'holding',
  line       mouse_line not null,
  notes      text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Mice
create table mice (
  id          uuid primary key default gen_random_uuid(),
  mid         text not null,
  sex         mouse_sex not null,
  line        mouse_line not null,
  generation  text,
  dob         date,
  status      mouse_status not null default '생존',
  cage_id     uuid references cages(id) on delete set null,
  genotype    genotype_result,
  litter_id   uuid,
  notes       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 4. Litters
create table litters (
  id          uuid primary key default gen_random_uuid(),
  cage_id     uuid references cages(id) on delete set null,
  line        mouse_line not null,
  birth_date  date not null,
  pup_count   int not null default 0,
  weaned      boolean not null default false,
  notes       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 5. Litter FK on mice
alter table mice
  add constraint mice_litter_fk
  foreign key (litter_id) references litters(id) on delete set null;

-- 6. Parent relationships
create table mouse_parents (
  child_id  uuid not null references mice(id) on delete cascade,
  parent_id uuid not null references mice(id) on delete cascade,
  role      text not null check (role in ('father','mother')),
  primary key (child_id, role)
);

-- 7. updated_at 트리거
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_cages_upd   before update on cages   for each row execute function set_updated_at();
create trigger trg_mice_upd    before update on mice    for each row execute function set_updated_at();
create trigger trg_litters_upd before update on litters for each row execute function set_updated_at();

-- 8. Indexes
create index on mice(cage_id);
create index on mice(litter_id);
create index on litters(cage_id);
create index on mouse_parents(child_id);

-- 9. View: 오늘의 할 일
create or replace view v_today_tasks as
select
  'weaning' as task_type,
  c.num     as cage_num,
  l.line,
  l.birth_date,
  (l.birth_date + interval '21 days')::date as due_date,
  ((l.birth_date + interval '21 days')::date - current_date) as days_until,
  l.pup_count,
  l.id as litter_id
from litters l
join cages c on c.id = l.cage_id
where l.weaned = false
  and (l.birth_date + interval '21 days')::date
      between current_date - 2 and current_date + 7
order by due_date;

-- 10. View: 개체 + 케이지 조인
create or replace view v_mice_full as
select
  m.*,
  c.num  as cage_num,
  c.type as cage_type
from mice m
left join cages c on c.id = m.cage_id;

-- 11. RLS: 누구나 읽기/쓰기 허용 (로그인 불필요)
alter table cages         enable row level security;
alter table mice          enable row level security;
alter table litters       enable row level security;
alter table mouse_parents enable row level security;

create policy "public all" on cages         for all using (true) with check (true);
create policy "public all" on mice          for all using (true) with check (true);
create policy "public all" on litters       for all using (true) with check (true);
create policy "public all" on mouse_parents for all using (true) with check (true);
