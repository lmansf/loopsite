'use client';

import type { ButtonHTMLAttributes } from 'react';

/**
 * The one button primitive. Unstyled beyond tokens — WP1/WP3 polish it.
 * Every interactive element in the site gets hover + focus-visible + active
 * states and at least two visual signifiers (rubric C4).
 */
export function Button({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest}>
      {children}
    </button>
  );
}
