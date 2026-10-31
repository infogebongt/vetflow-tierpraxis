-- VetFlow Tierpraxis: Tabellen für den Live-Betrieb (Supabase SQL Editor ausführen)

create table if not exists tickets (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  customer_name text not null,
  email text,
  phone text,
  address text,
  patient_name text,
  species text,
  complaint text not null,
  urgency text default 'Normal',
  status text default 'Neu',
  vet text,
  report jsonb
);

create table if not exists team (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  role text,
  category text,
  rate numeric default 150,
  phone text,
  status text default 'Bereit'
);

create table if not exists customers (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  email text,
  phone text,
  address text,
  animals text,
  notes text
);

alter table tickets enable row level security;
alter table team enable row level security;
alter table customers enable row level security;

-- ACHTUNG: offene Policies für den anon-Key (wie im Handwerker-Paket).
-- Für echte Patientendaten später durch Supabase Auth + restriktive Policies ersetzen.
create policy "anon all tickets" on tickets for all to anon using (true) with check (true);
create policy "anon all team" on team for all to anon using (true) with check (true);
create policy "anon all customers" on customers for all to anon using (true) with check (true);

alter publication supabase_realtime add table tickets, team, customers;
