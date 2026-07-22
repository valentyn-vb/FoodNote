import { ValueTransformer } from 'typeorm';

/**
 * Postgres `numeric`/`decimal` columns come back from the `pg` driver as
 * strings. This transformer keeps them as JS `number`s so responses satisfy
 * the `z.number()` contract schemas in `@foodnote/shared`. Null/undefined pass
 * through untouched.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
