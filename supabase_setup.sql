-- VetFlow Tierpraxis: Tabellen, Rechte und Funktionen (Supabase SQL Editor ausführen)

create table if not exists tickets (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  customer_name text not null,
  email text, phone text, address text,
  patient_name text, species text,
  complaint text not null,
  urgency text default 'Normal',
  status text default 'Neu',
  vet text,
  report jsonb,
  public_token uuid not null default gen_random_uuid()
);
create unique index if not exists tickets_public_token_key on tickets(public_token);

create table if not exists team (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null, role text, category text,
  rate numeric default 150, phone text, status text default 'Bereit'
);

create table if not exists customers (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null, email text, phone text, address text, animals text, notes text
);

-- Rollen: wer in "staff" steht, darf sich anmelden (praxis = alles, team = Fälle lesen/bearbeiten)
create table if not exists staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('praxis','team'))
);

alter table tickets enable row level security;
alter table team enable row level security;
alter table customers enable row level security;
alter table staff enable row level security;

create or replace function my_role() returns text
language sql security definer stable set search_path = public as
$$ select role from staff where user_id = auth.uid() $$;
create or replace function is_praxis() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from staff where user_id = auth.uid() and role = 'praxis') $$;
create or replace function is_staff() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from staff where user_id = auth.uid()) $$;

create policy "praxis all tickets" on tickets for all to authenticated using (is_praxis()) with check (is_praxis());
create policy "praxis all team" on team for all to authenticated using (is_praxis()) with check (is_praxis());
create policy "praxis all customers" on customers for all to authenticated using (is_praxis()) with check (is_praxis());
create policy "team read tickets" on tickets for select to authenticated using (is_staff());
create policy "team update tickets" on tickets for update to authenticated using (is_staff()) with check (is_staff());
create policy "team read team" on team for select to authenticated using (is_staff());

-- Tierhalter (nicht angemeldet): nur über diese Funktionen, kein Tabellenzugriff
create or replace function submit_ticket(
  p_customer_name text, p_email text, p_phone text, p_address text,
  p_patient_name text, p_species text, p_complaint text, p_urgency text
) returns table(ticket_id bigint, token uuid)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_customer_name),'') = '' or coalesce(trim(p_complaint),'') = ''
     or coalesce(trim(p_patient_name),'') = '' or coalesce(trim(p_phone),'') = ''
     or length(p_customer_name) > 200 or length(p_email) > 200 or length(p_phone) > 60
     or length(p_address) > 300 or length(p_patient_name) > 100 or length(p_species) > 60
     or length(p_complaint) > 4000 then
    raise exception 'Ungültige Eingabe';
  end if;
  return query
    insert into tickets (customer_name, email, phone, address, patient_name, species, complaint, urgency, status)
    values (trim(p_customer_name), trim(p_email), trim(p_phone), trim(p_address), trim(p_patient_name), trim(p_species),
            trim(p_complaint), case when p_urgency in ('Notfall','Dringend','Normal') then p_urgency else 'Normal' end, 'Neu')
    returning tickets.id, tickets.public_token;
end $$;

create or replace function my_tickets(p_tokens uuid[])
returns table(id bigint, patient_name text, species text, complaint text, urgency text, status text, vet text)
language sql security definer stable set search_path = public as $$
  select t.id, t.patient_name, t.species, t.complaint, t.urgency, t.status, t.vet
  from tickets t where t.public_token = any(p_tokens) order by t.id desc
$$;

revoke all on function submit_ticket(text,text,text,text,text,text,text,text) from public;
revoke all on function my_tickets(uuid[]) from public;
revoke all on function my_role() from public;
revoke all on function is_praxis() from public;
revoke all on function is_staff() from public;
grant execute on function submit_ticket(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function my_tickets(uuid[]) to anon, authenticated;
grant execute on function my_role() to authenticated;
grant execute on function is_praxis() to authenticated;
grant execute on function is_staff() to authenticated;

alter publication supabase_realtime add table tickets, team, customers;

-- Danach: Benutzer im Supabase-Dashboard (Authentication > Users) anlegen und hier eintragen:
-- insert into staff (user_id, role) values ('<user-uuid>', 'praxis');
