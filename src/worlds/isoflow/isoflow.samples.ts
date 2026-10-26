import type { FlowSpec } from './isoflow.types.ts'

/** Realtime sync: one write on the server, every subscribed client updated */
const sync: FlowSpec = {
  id: 'sync',
  title: 'One write.',
  subtitle: 'Every client in sync.',
  description:
    'A message from a client calls a function on the server, which writes a row to the database. ' +
    'Every client subscribed to the table receives the new row right away.',
  mode: 'stream',
  groups: { backend: { label: 'Backend', caption: 'server + database' } },
  nodes: [
    { id: 'alice', kind: 'client', caption: 'Sending client', label: '#team-chat', lines: [] },
    { id: 'bob', kind: 'client', caption: 'Sending client', label: '#team-chat', lines: [] },
    {
      id: 'reducer',
      kind: 'server',
      caption: 'Server logic',
      label: 'send_message',
      group: 'backend',
      w: 5,
      h: 3,
      lines: [
        '@reducer',
        'def send_message(ctx, text):',
        '  ctx.db.message.insert(',
        '    sender=ctx.sender, text=text)',
      ],
    },
    {
      id: 'db',
      kind: 'database',
      caption: 'Database',
      label: 'message',
      group: 'backend',
      w: 4,
      h: 3,
      table: { columns: ['id', 'message'], rows: [] },
    },
    { id: 'web', kind: 'client', caption: 'Subscribed client', label: '#team-chat', lines: [] },
    { id: 'ios', kind: 'client', caption: 'Subscribed client', label: '#team-chat', lines: [] },
    { id: 'desktop', kind: 'client', caption: 'Subscribed client', label: '#team-chat', lines: [] },
  ],
  edges: [
    ['alice', 'reducer', 'call'],
    ['bob', 'reducer', 'call'],
    ['reducer', 'db', 'insert'],
    ['db', 'web'],
    ['db', 'ios'],
    ['db', 'desktop'],
  ],
}

/** CI/CD: build and test in parallel, deploy behind a canary */
const ci: FlowSpec = {
  id: 'ci',
  title: 'Push to main.',
  subtitle: 'Shipped behind a canary.',
  description:
    'A CI/CD pipeline: checks run in parallel after the install, the image is deployed to staging, ' +
    'tested end to end and rolled out to 10% of the traffic. A health check promotes or rolls back.',
  groups: {
    ci: { label: 'CI', caption: 'build + test' },
    cd: { label: 'CD', caption: 'deploy' },
  },
  nodes: [
    { id: 'push', kind: 'trigger', label: 'git push', lines: ['main · 4f2a9c1'], duration: 0.4 },
    { id: 'checkout', label: 'Checkout', duration: 0.8 },
    { id: 'install', label: 'Install deps', group: 'ci', duration: 2.2, lines: ['yarn --frozen'] },
    { id: 'lint', label: 'Lint', group: 'ci', duration: 1.4, lines: ['eslint .'] },
    { id: 'types', label: 'Typecheck', group: 'ci', duration: 2.0, lines: ['tsc --noEmit'] },
    {
      id: 'unit',
      label: 'Unit tests',
      group: 'ci',
      duration: 3.2,
      failRate: 0.06,
      lines: ['vitest run'],
    },
    { id: 'build', label: 'Build', group: 'ci', duration: 2.6, lines: ['vite build'] },
    { id: 'image', kind: 'storage', label: 'Docker image', group: 'ci', duration: 2.4 },
    { id: 'staging', kind: 'server', label: 'Deploy staging', group: 'cd', duration: 1.8 },
    {
      id: 'e2e',
      label: 'E2E tests',
      group: 'cd',
      duration: 3.6,
      failRate: 0.08,
      lines: ['playwright test'],
    },
    { id: 'canary', kind: 'server', label: 'Canary 10%', group: 'cd', duration: 3.0 },
    { id: 'gate', kind: 'decision', label: 'Healthy?', group: 'cd', duration: 0.8 },
    { id: 'prod', kind: 'server', label: 'Promote to prod', group: 'cd', duration: 1.6 },
    { id: 'rollback', label: 'Rollback', group: 'cd', duration: 1.2 },
    { id: 'notify', kind: 'end', label: 'Notify #releases', duration: 0.5 },
  ],
  edges: [
    ['push', 'checkout'],
    ['checkout', 'install'],
    ['install', 'lint'],
    ['install', 'types'],
    ['install', 'unit'],
    ['install', 'build'],
    ['build', 'image'],
    ['lint', 'staging'],
    ['types', 'staging'],
    ['unit', 'staging'],
    ['image', 'staging'],
    ['staging', 'e2e'],
    ['e2e', 'canary'],
    ['canary', 'gate'],
    ['gate', 'prod', 'yes'],
    ['gate', 'rollback', 'no'],
    ['prod', 'notify'],
    ['rollback', 'notify'],
  ],
}

/** ETL: extract from three sources, model in the warehouse, feed dashboards and a model */
const etl: FlowSpec = {
  id: 'etl',
  title: 'Nightly ETL.',
  subtitle: 'Three sources, one warehouse.',
  description:
    'A data pipeline: orders, events and payments are extracted in parallel, staged, deduplicated and ' +
    'modelled, then loaded into the warehouse and the feature store. Quality checks gate the publish.',
  groups: {
    extract: { label: 'Extract', caption: 'sources' },
    warehouse: { label: 'Warehouse', caption: 'load' },
  },
  nodes: [
    { id: 'cron', kind: 'trigger', label: 'Nightly 02:00', lines: ['0 2 * * *'], duration: 0.4 },
    {
      id: 'orders',
      kind: 'database',
      label: 'Orders',
      caption: 'Postgres CDC',
      group: 'extract',
      duration: 2.8,
    },
    {
      id: 'events',
      kind: 'storage',
      label: 'Click events',
      caption: 'S3 parquet',
      group: 'extract',
      duration: 3.4,
    },
    {
      id: 'payments',
      kind: 'api',
      label: 'Payments',
      caption: 'Stripe API',
      group: 'extract',
      duration: 2.2,
      failRate: 0.05,
    },
    { id: 'stage', kind: 'join', label: 'Staging tables', duration: 1.2 },
    { id: 'dedupe', label: 'Deduplicate', duration: 1.6 },
    { id: 'dbt', label: 'dbt models', duration: 3.0, lines: ['dbt run --select +marts'] },
    { id: 'dwh', kind: 'database', label: 'Warehouse', group: 'warehouse', duration: 2.4 },
    { id: 'features', kind: 'storage', label: 'Feature store', group: 'warehouse', duration: 2.0 },
    { id: 'quality', kind: 'decision', label: 'Checks pass?', duration: 1.4 },
    { id: 'dash', kind: 'client', label: 'Dashboards', duration: 1.0 },
    { id: 'churn', kind: 'model', label: 'Retrain churn', duration: 3.8 },
    { id: 'page', kind: 'end', label: 'Page on-call', duration: 0.5 },
  ],
  edges: [
    ['cron', 'orders'],
    ['cron', 'events'],
    ['cron', 'payments'],
    ['orders', 'stage'],
    ['events', 'stage'],
    ['payments', 'stage'],
    ['stage', 'dedupe'],
    ['dedupe', 'dbt'],
    ['dbt', 'dwh'],
    ['dbt', 'features'],
    ['dwh', 'quality'],
    ['quality', 'dash', 'pass'],
    ['quality', 'page', 'fail'],
    ['features', 'churn'],
  ],
}

/** ML: train three models in parallel, keep the best one if it beats the baseline */
const ml: FlowSpec = {
  id: 'ml',
  title: 'Train three.',
  subtitle: 'Ship the best one.',
  description:
    'A training pipeline: new data is cleaned and split, three models train in parallel and are ' +
    'evaluated on the held-out test set. The best one is registered and deployed if it beats the baseline.',
  groups: { train: { label: 'Training', caption: 'fan-out' } },
  nodes: [
    { id: 'data', kind: 'trigger', label: 'New data', lines: ['s3://lake/2026-10'], duration: 0.5 },
    { id: 'clean', label: 'Clean & featurize', duration: 2.4 },
    { id: 'split', label: 'Train/test split', duration: 0.9, lines: ['80 / 20, seed 42'] },
    { id: 'xgb', kind: 'model', label: 'XGBoost', group: 'train', duration: 4.2 },
    { id: 'mlp', kind: 'model', label: 'MLP', group: 'train', duration: 5.6, failRate: 0.05 },
    { id: 'logreg', kind: 'model', label: 'Logistic reg.', group: 'train', duration: 2.4 },
    { id: 'eval', kind: 'join', label: 'Evaluate', duration: 1.8, lines: ['AUC · F1 · latency'] },
    { id: 'better', kind: 'decision', label: 'Beats baseline?', duration: 0.6 },
    { id: 'register', kind: 'storage', label: 'Register model', duration: 1.0 },
    { id: 'deploy', kind: 'server', label: 'Deploy endpoint', duration: 2.0 },
    { id: 'report', kind: 'end', label: 'Keep current', duration: 0.6 },
    { id: 'monitor', kind: 'end', label: 'Drift monitor', duration: 0.6 },
  ],
  edges: [
    ['data', 'clean'],
    ['clean', 'split'],
    ['split', 'xgb'],
    ['split', 'mlp'],
    ['split', 'logreg'],
    ['split', 'eval', 'test set'],
    ['xgb', 'eval'],
    ['mlp', 'eval'],
    ['logreg', 'eval'],
    ['eval', 'better'],
    ['better', 'register', 'yes'],
    ['better', 'report', 'no'],
    ['register', 'deploy'],
    ['deploy', 'monitor'],
  ],
}

/** Agent: an LLM plans, calls tools in parallel, checks its answer */
const agent: FlowSpec = {
  id: 'agent',
  title: 'Plan, call, check.',
  subtitle: 'An agent at work.',
  description:
    'An agent workflow: a planner splits the request into tool calls that run in parallel, the results ' +
    'are synthesized into a draft, and a self-check decides whether the draft goes out or is revised first.',
  groups: { tools: { label: 'Tools', caption: 'parallel calls' } },
  nodes: [
    {
      id: 'request',
      kind: 'client',
      label: 'User request',
      lines: ['"Q3 churn by plan?"'],
      duration: 0.4,
    },
    { id: 'plan', kind: 'model', label: 'Planner', duration: 1.6, lines: ['3 tool calls'] },
    { id: 'search', kind: 'api', label: 'Web search', group: 'tools', duration: 2.4 },
    {
      id: 'sql',
      kind: 'database',
      label: 'Query DB',
      group: 'tools',
      duration: 1.8,
      lines: ['SELECT plan, …'],
    },
    {
      id: 'code',
      label: 'Run code',
      group: 'tools',
      duration: 3.0,
      failRate: 0.06,
      lines: ['pandas · plot'],
    },
    { id: 'synth', kind: 'model', label: 'Synthesize', duration: 2.2 },
    { id: 'check', kind: 'decision', label: 'Self-check', duration: 0.9 },
    { id: 'revise', kind: 'model', label: 'Revise draft', duration: 1.8 },
    { id: 'respond', kind: 'client', label: 'Respond', duration: 0.6 },
  ],
  edges: [
    ['request', 'plan'],
    ['plan', 'search'],
    ['plan', 'sql'],
    ['plan', 'code'],
    ['search', 'synth'],
    ['sql', 'synth'],
    ['code', 'synth'],
    ['synth', 'check'],
    ['check', 'respond', 'ok'],
    ['check', 'revise', 'fix'],
    ['revise', 'respond'],
  ],
}

export const SAMPLES: FlowSpec[] = [sync, ci, etl, ml, agent]
