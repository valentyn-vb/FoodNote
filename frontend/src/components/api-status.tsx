'use client';

import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@foodnote/shared';

export function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(healthResponseSchema.parse(data)))
      .catch(() => setError('API unreachable'));
  }, []);

  if (error) {
    return <p className="text-sm text-destructive-text">Backend: {error}</p>;
  }
  if (!health) {
    return <p className="text-sm text-muted-foreground">Backend: checking…</p>;
  }
  return (
    <p className="text-sm text-success-text">
      Backend: {health.service} is {health.status} ({health.timestamp})
    </p>
  );
}
