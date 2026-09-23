-- Cache completo dos dados do DogData (ranking de holder, lote no DogCity).
alter table public.dog_balances add column if not exists data jsonb;
