"use client";

import { startTransition, useState, type FormEvent } from "react";
import type { FieldErrors } from "@/lib/validate";

/**
 * Runs a form's validation before it submits, shows each problem beside its
 * field, focuses the first one, and clears a message as soon as that field
 * is edited. Errors the server sends back are shown the same way.
 *
 * The form is submitted by calling the action directly rather than through
 * <form action>, because React resets a form after its action runs — which
 * would wipe everything typed (and the chosen photo) whenever the server
 * turns something down, such as an item ID that is already taken.
 */
export function useFormErrors(
  serverFields: FieldErrors | undefined,
  validate: (fd: FormData, form: HTMLFormElement) => FieldErrors,
  dispatch: (fd: FormData) => void
) {
  const [local, setLocal] = useState<FieldErrors | null>(null);
  const [lastServer, setLastServer] = useState(serverFields);

  // A new server response replaces anything shown from the last attempt.
  if (serverFields !== lastServer) {
    setLastServer(serverFields);
    setLocal(null);
  }

  const errors = local ?? serverFields ?? {};

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const found = validate(fd, form);
    if (Object.keys(found).length) {
      setLocal(found);
      const first = Object.keys(found)[0];
      form.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)?.focus();
      return;
    }
    setLocal(null);
    startTransition(() => dispatch(fd));
  };

  const onInput = (e: FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name || (e.target as HTMLElement).dataset?.field;
    if (!name || !errors[name]) return;
    const { [name]: _gone, ...rest } = errors;
    setLocal(rest);
  };

  return { errors, onSubmit, onInput };
}
