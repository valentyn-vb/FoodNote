'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@foodnote/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { login } from '@/lib/actions/auth';
import { applyActionError } from '@/lib/actions/apply-error';
import { FORM_ERROR } from '@/lib/actions/result';
import { AuthTextField } from '../auth-text-field';

export function LoginForm({ destination }: { destination?: string }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  // The action is the write transport and nothing more: react-hook-form still
  // owns the fields, the schema and the messages. `isPending` is the only pending
  // state — `formState.isSubmitting` settles the moment the action resolves,
  // which is before the redirect it triggers has navigated anywhere.
  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await login(data, destination);
      // A success never gets here: the action redirects, so only a failure
      // returns.
      if (!result.ok) applyActionError(form, result);
    });
  });

  // Drawn inline rather than in a toast: the backend does not say which of the
  // two was wrong, so there is no field to hang it under, and this is the most
  // common failure of the most-used form in the app.
  const formError = form.formState.errors[FORM_ERROR]?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Log in</CardTitle>
        <CardDescription>Welcome back to FoodNote.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <AuthTextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <AuthTextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          {formError && (
            <p role="alert" className="text-sm text-destructive-text">
              {formError}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full"
          >
            {isPending && <Spinner />}
            Log in
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          No account yet?{' '}
          {/* A `Link` wearing the button look, not a `Button` rendering a link:
              through `Button` this navigation was announced as a button with no
              URL. `buttonVariants` is upstream's answer for exactly this. */}
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: 'link' }),
              'h-auto gap-1 p-0',
            )}
          >
            Register
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
