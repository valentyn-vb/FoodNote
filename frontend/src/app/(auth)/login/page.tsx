import type { Metadata } from 'next';
import { NEXT_PARAM } from '@/lib/server/next-param';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Log in — FoodNote',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Through the constant, not the literal `next`: proxy writes this parameter
  // and this page reads it, and the whole point of the shared module is that the
  // two halves cannot drift apart on the name.
  const destination = (await searchParams)[NEXT_PARAM];

  // Read here rather than with `useSearchParams()` in the form: a client hook
  // reading the query string obliges its page to sit inside a Suspense boundary,
  // and this is server data, which crosses as a prop (#89). The action validates
  // the value again before trusting it — an unchecked destination is an open
  // redirect, and this one arrives in a URL anybody can write.
  return (
    <LoginForm
      destination={typeof destination === 'string' ? destination : undefined}
    />
  );
}
