'use client';

import { useEffect, useState } from 'react';
import { Text } from '@/components/ui/text';
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
    return (
      <Text tone="danger" render={<p />}>
        Backend: {error}
      </Text>
    );
  }
  if (!health) {
    return (
      <Text tone="muted" render={<p />}>
        Backend: checking…
      </Text>
    );
  }
  return (
    <Text tone="success" render={<p />}>
      Backend: {health.service} is {health.status} ({health.timestamp})
    </Text>
  );
}
