'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  updateAccountRequestSchema,
  type UpdateAccountRequest,
} from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthTextField } from '../../(auth)/auth-text-field';

const EDIT_PROFILE_FORM_ID = 'edit-profile-form';

export function EditProfileDialog() {
  const { user, updateAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<UpdateAccountRequest>({
    resolver: zodResolver(updateAccountRequestSchema),
    defaultValues: { firstName: '', lastName: '' },
  });

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (next && user) {
      form.reset({ firstName: user.firstName, lastName: user.lastName });
    }
    setOpen(next);
  }

  async function handleSave(values: UpdateAccountRequest) {
    setSaving(true);
    try {
      await updateAccount(values);
      toast.success('Profile updated');
      setOpen(false);
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        disabled={!user}
        className="h-auto p-0 font-sans text-title font-semibold text-primary-deep hover:bg-transparent disabled:opacity-50"
      >
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-sans text-title font-semibold text-text">
            Edit profile
          </DialogTitle>
          <DialogDescription className="font-sans text-caption text-text-muted">
            Update the name shown across your account.
          </DialogDescription>
        </DialogHeader>

        <form
          id={EDIT_PROFILE_FORM_ID}
          onSubmit={form.handleSubmit(handleSave)}
          noValidate
          className="flex flex-col gap-5 px-5 pt-4.5"
        >
          <AuthTextField
            control={form.control}
            name="firstName"
            label="First name"
            autoComplete="given-name"
          />
          <AuthTextField
            control={form.control}
            name="lastName"
            label="Last name"
            autoComplete="family-name"
          />
        </form>

        <DialogFooter className="flex-row justify-end gap-2.5">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={EDIT_PROFILE_FORM_ID}
            variant="cta"
            disabled={saving}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
