'use client';

import { useAuth } from '@/components/auth-provider';
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
import { ApiError } from '@/lib/api-client';
import { registerRequestSchema, type RegisterRequest } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthTextField } from '../auth-text-field';

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await register(data);
      router.push('/onboarding');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError('email', {
          message: 'This email is already registered.',
        });
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  });

  const { isSubmitting } = form.formState;

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
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Spinner />}
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
