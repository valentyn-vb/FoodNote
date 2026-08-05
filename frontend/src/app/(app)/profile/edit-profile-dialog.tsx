'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
  type AuthUser,
  type UpdateAccountRequest,
} from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { updateAccount } from '@/lib/actions/profile';
import { applyActionError } from '@/lib/actions/apply-error';
import { AuthTextField } from '../../(auth)/auth-text-field';
import { Edit2Icon } from 'lucide-react';

const EDIT_PROFILE_FORM_ID = 'edit-profile-form';

export function EditProfileDialog({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<UpdateAccountRequest>({
    resolver: zodResolver(updateAccountRequestSchema),
    defaultValues: { firstName: '', lastName: '' },
  });

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (next) {
      form.reset({ firstName: user.firstName, lastName: user.lastName });
    }
    setOpen(next);
  }

  async function handleSave(values: UpdateAccountRequest) {
    setSaving(true);
    // The name is rendered from a server read in three places — this page, the
    // sidebar and the header — and the action's `refresh()` is what re-renders
    // all three, including the layout the sidebar and header live in.
    const result = await updateAccount(values);
    setSaving(false);

    if (!result.ok) {
      applyActionError(form, result);
      return;
    }

    toast.success('Profile updated');
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Edit2Icon className="size-3 mr-1" />
        Edit profile
      </DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update the name shown across your account.
          </DialogDescription>
        </DialogHeader>

        <form
          id={EDIT_PROFILE_FORM_ID}
          onSubmit={form.handleSubmit(handleSave)}
          noValidate
          className="flex flex-col gap-6"
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

        <DialogFooter className="flex-row justify-end gap-2">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" form={EDIT_PROFILE_FORM_ID} disabled={saving}>
            {saving && <Spinner />}
            Update profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
