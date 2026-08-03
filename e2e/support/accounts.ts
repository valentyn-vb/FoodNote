import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Account = { email: string; password: string };

type Accounts = {
  runId: string;
  /** Three weeks of weights and meals, and an active goal. */
  onboarded: Account;
  /** Registered and nothing else — no profile, no weight, no goal. */
  fresh: Account;
};

/**
 * Written by `scripts/prepare.mjs` before Playwright starts, because the run id
 * has to be the same in the process that seeds and the process that logs in.
 */
export const accounts: Accounts = JSON.parse(
  readFileSync(resolve(__dirname, '../.auth/accounts.json'), 'utf8'),
);

export const storageStateFor = (name: 'onboarded' | 'fresh') =>
  resolve(__dirname, `../.auth/${name}.json`);
