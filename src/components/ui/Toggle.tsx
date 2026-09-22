'use client';

import type { ButtonHTMLAttributes } from 'react';

/** A two-state control. State is carried by aria-pressed AND by the label text. */
export function Toggle({
  pressed,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean }) {
  return (
    <button type="button" aria-pressed={pressed} {...rest}>
      {children}
    </button>
  );
}
