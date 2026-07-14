'use client';

import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@foodnote/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(healthResponseSchema.parse(data)))
      .catch(() => setError('API unreachable'));
  }, []);

  if (error) {
    return <p className="text-red-500">Backend: {error}</p>;
  }
  if (!health) {
    return <p className="text-neutral-400">Backend: checking…</p>;
  }
  return (
    <p className="text-green-600">
      Backend: {health.service} is {health.status} ({health.timestamp})
    </p>
  );
}
