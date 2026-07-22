import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Goal } from '../goal/goal.entity';
import { MealEntry } from '../meal/meal-entry.entity';
import { MealItem } from '../meal/meal-item.entity';
import { UserProfile } from '../profile/user-profile.entity';
import { User } from '../user/user.entity';
import { WeightEntry } from '../weight/weight-entry.entity';

/**
 * The single source of truth for the TypeORM connection. Both Nest
 * (AppModule) and the TypeORM CLI import from here, so entity discovery and
 * migration globs can never drift. `autoLoadEntities` is intentionally not
 * used — the entity list below is explicit.
 */
export const entities = [
  User,
  UserProfile,
  Goal,
  WeightEntry,
  MealEntry,
  MealItem,
];

export function buildDataSourceOptions(
  url: string,
  overrides: Partial<DataSourceOptions> = {},
): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities,
    // __dirname resolves to src/database (ts-node/tests) or dist/database
    // (compiled), so the right extension is picked up in either context.
    migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
    ...overrides,
  } as DataSourceOptions;
}

// Used only by the TypeORM CLI (`-d src/database/data-source.ts`). Nest builds
// its own options from ConfigService in AppModule. The CLI does not load env
// files on its own, so mirror AppModule's envFilePath order here.
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (required by the TypeORM CLI)');
}

export const AppDataSource = new DataSource(buildDataSourceOptions(url));
