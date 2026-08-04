'use client';

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
import { registerRequestSchema, type RegisterRequest } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { applyActionError } from '@/lib/actions/apply-error';
import { register } from '@/lib/actions/auth';
import { AuthTextField } from '../auth-text-field';

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  // See login-form: the action is the transport, `isPending` is the pending
  // state, and where the failure is drawn is `applyActionError`'s decision — the
  // duplicate-email case comes back as a field error and lands under Email
  // through the same markup a client-side rejection uses.
  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await register(data);
      if (!result.ok) applyActionError(form, result);
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Create your account</CardTitle>
        <CardDescription>
          Start planning and tracking with FoodNote.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <AuthTextField
            control={form.control}
            name="firstName"
            label="First name"
            autoComplete="given-name"
            placeholder="Enter your first name"
          />
          <AuthTextField
            control={form.control}
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            placeholder="Enter your last name"
          />
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
            autoComplete="new-password"
            description="At least 8 characters."
          />
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full"
          >
            {isPending && <Spinner />}
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          {/* A `Link` wearing the button look — see login-form. */}
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'link' }),
              'h-auto gap-1 p-0',
            )}
          >
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
