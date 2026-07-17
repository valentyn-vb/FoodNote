'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

/**
 * Password input with a show/hide toggle. Drop-in for Input: forwards all
 * input props (the type is managed by the visibility toggle). The wrapping
 * InputGroup carries the border/focus/invalid ring, so aria-invalid on the
 * inner input styles the whole control.
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = React.useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput type={visible ? 'text' : 'password'} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="hover:bg-transparent"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
