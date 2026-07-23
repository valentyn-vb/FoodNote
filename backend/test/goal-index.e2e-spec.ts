import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Goals partial unique index (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
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
