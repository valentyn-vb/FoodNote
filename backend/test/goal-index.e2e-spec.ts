import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createTestApp } from './create-test-app';

describe('Goals partial unique index (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp({ prefix: false });
    ds = app.get<DataSource>(getDataSourceToken());
  });

  afterAll(() => app.close());

  it('creates a partial unique index on active goals', async () => {
    const rows: Array<{ indexname: string }> = await ds.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'goals' AND indexname = 'IDX_goals_one_active_per_user'`,
    );
    expect(rows).toHaveLength(1);
  });
});
