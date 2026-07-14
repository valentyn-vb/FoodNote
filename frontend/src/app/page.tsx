import { ApiStatus } from '@/components/api-status';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">FoodNote</h1>
      <p className="text-zinc-500">
        Weight-loss planning and calorie tracking with AI-assisted meal logging.
      </p>
      <ApiStatus />
    </main>
  );
}
