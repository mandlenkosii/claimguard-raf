-- Migration 1: extensions and shared trigger functions (Section 8.6).
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'This record is append-only and cannot be changed or deleted' using errcode = 'P0001';
end;
$$;
