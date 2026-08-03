'use client';

import { useAuth } from '@/components/auth-provider';
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
  type UpdateAccountRequest,
} from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthTextField } from '../../(auth)/auth-text-field';
import { Edit2Icon } from 'lucide-react';

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
        render={<Button variant="outline" size="sm" />}
      >
        <Edit2Icon className="size-3 mr-1" />
        Edit profile
      </DialogTrigger>
      {/* Every dialog caps its own height: the primitive is upstream's, which
          has neither a cap nor a scroller, so on a short viewport — a phone
          with the keyboard up — it grows past both edges with no way to reach
          its own submit button. */}
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
