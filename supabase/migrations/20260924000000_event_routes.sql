-- Rotas do evento semanal passam a valer no ranking (espelha src/lib/events.ts).
create or replace function public.route_max_score(p_route text) returns integer
language sql immutable as $$
  select case p_route
    when 'low-orbit' then 100
    when 'sea-of-tranquility' then 250
    when 'asteroid-belt' then 500
    when 'mars-colony' then 1000
    when 'event-meteor-shower' then 400
    when 'event-solar-storm' then 350
    when 'event-comet-hunt' then 550
    when 'event-mars-marathon' then 800
    else null
  end
$$;
