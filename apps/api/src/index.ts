import 'dotenv/config';
import { serve } from '@hono/node-server';
import { readConfig, AppContext } from './context';
import { SqliteRankStore } from './rankStore.sqlite';
import { Sampler } from './sampler';
import { createApp } from './app';

const config = readConfig(process.env);
const rankStore = new SqliteRankStore(config.dbPath);
const ctx = new AppContext(config.trackedEntries, rankStore);
const sampler = new Sampler(ctx);
const startedAt = Date.now();
const app = createApp(ctx, sampler, startedAt, {
  logger: process.env.NODE_ENV !== 'production',
  compress: true,
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`fplq api listening on http://localhost:${info.port}`);
  const tracked = config.trackedEntries.length ? config.trackedEntries.join(', ') : 'none';
  console.log(`tracked entries: ${tracked} | db: ${config.dbPath}`);
});

sampler.start();
