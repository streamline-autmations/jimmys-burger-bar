// A throwaway Postgres (PGlite, in-process, no Docker) with just enough of
// Supabase stubbed in for the Restaurant Direct baseline to apply.
//
// What is stubbed, and why it is safe: auth.users/auth.uid() (only the shape
// staff lookups need), net.http_post (records requests instead of sending
// them, so tests can assert a notification was queued), and cron.schedule /
// cron.job (records schedules). Extensions are skipped because PGlite cannot
// load pg_net or pg_cron; the stubs stand in for exactly the calls we make.

import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/** Every migration, in the order Supabase applies them: the baseline first, then anything newer. */
export const migrationFiles = () =>
  fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort()
    .map((file) => `supabase/migrations/${file}`);

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;

  -- Hosted Supabase's default privileges: every new table, sequence and
  -- function in public is granted to anon and authenticated. Without these the
  -- baseline's revokes would be tested against a database that never granted
  -- anything, and pass for the wrong reason.
  alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema net;
  create sequence net.request_id_seq;
  create table net.http_request_queue (id bigint primary key, url text not null, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
                                headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000)
    returns bigint language plpgsql as $$
    declare v_id bigint := nextval('net.request_id_seq');
    begin
      insert into net.http_request_queue (id, url, body, headers) values (v_id, url, body, headers);
      return v_id;
    end $$;

  create schema cron;
  create table cron.job (jobid bigserial primary key, jobname text unique, schedule text not null, command text not null,
                         database text not null default current_database(), username text not null default current_user,
                         active boolean not null default true);
  create function cron.schedule(job_name text, schedule text, command text) returns bigint language plpgsql as $$
    declare v_id bigint;
    begin
      insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
      on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
      returning jobid into v_id;
      return v_id;
    end $$;
  create function cron.unschedule(job_id bigint) returns boolean language plpgsql as $$
    begin delete from cron.job where jobid = job_id; return found; end $$;
`;

/** PGlite cannot load pg_net or pg_cron; the stubs above replace them. */
const withoutExtensions = (sql) => sql.replace(/^\s*create extension[^;]*;/gim, '-- (extension skipped in PGlite)');

export async function createDatabase({ baseline = true, files = [] } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  if (baseline) {
    for (const file of migrationFiles()) await db.exec(withoutExtensions(fs.readFileSync(file, 'utf8')));
  }
  for (const file of files) await db.exec(withoutExtensions(fs.readFileSync(file, 'utf8')));
  return db;
}

export async function fingerprint(db) {
  const sql = fs.readFileSync('supabase/snapshot/fingerprint.sql', 'utf8');
  const { rows } = await db.query(sql);
  return rows;
}

/** Runs `work` as a role, inside a transaction that is always rolled back. */
export async function asRole(db, role, work, { userId } = {}) {
  await db.exec('begin');
  try {
    if (userId) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await db.exec(`set local role ${role}`);
    return await work();
  } finally {
    await db.exec('rollback');
  }
}
