"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "../_components/submit-button";

type Errors = { email?: string; password?: string };

const validateEmail = (value: string) => {
  const email = value.trim();
  if (!email) return "Enter your email.";
  if (!/^\S+@\S+$/.test(email)) return "Enter a valid email.";
  return undefined;
};
const validatePassword = (value: string) => (value ? undefined : "Enter your password.");

/** Поля читають pending з форми: під час входу вони readonly (не disabled), щоб значення лишалось і фокус не падав. */
function Fields({ errors, validate, serverError, notice }: { errors: Errors; validate: (name: keyof Errors, value: string) => void; serverError: boolean; notice: ReactNode }) {
  const { pending } = useFormStatus();
  const [caps, setCaps] = useState(false);
  const invalid = serverError ? true : undefined;

  return (
    <>
      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          size="lg"
          inputMode="email"
          autoComplete="email"
          autoFocus={serverError}
          readOnly={pending}
          aria-invalid={errors.email ? true : invalid}
          aria-describedby={errors.email ? "email-error" : undefined}
          onBlur={(event) => validate("email", event.target.value)}
          onChange={(event) => errors.email && validate("email", event.target.value)}
        />
      </Field>
      <Field id="password" label="Password" error={errors.password}>
        <PasswordInput
          id="password"
          name="password"
          size="lg"
          autoComplete="current-password"
          readOnly={pending}
          aria-invalid={errors.password ? true : invalid}
          aria-describedby={errors.password ? "password-error" : "password-caps"}
          onBlur={(event) => validate("password", event.target.value)}
          onChange={(event) => errors.password && validate("password", event.target.value)}
          onKeyDown={(event) => setCaps(event.getModifierState("CapsLock"))}
          onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))}
        />
        <p id="password-caps" aria-live="polite" className="text-meta text-status-due-soon-foreground empty:hidden">
          {caps ? "Caps Lock is on." : ""}
        </p>
      </Field>
      {notice}
      <SubmitButton pendingText="Signing in…" size="xl" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </>
  );
}

/** Вхід: перевірка на blur і на submit (не на кожен символ), помилка сервера над кнопкою, без вбудованих підказок браузера. */
export function LoginForm({ action, serverError, next }: { action: (formData: FormData) => Promise<void>; serverError?: string; next?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (name: keyof Errors, value: string) =>
    setErrors((prev) => ({ ...prev, [name]: name === "email" ? validateEmail(value) : validatePassword(value) }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const next: Errors = {
      email: validateEmail(String(data.get("email") ?? "")),
      password: validatePassword(String(data.get("password") ?? "")),
    };
    if (next.email || next.password) {
      event.preventDefault();
      setErrors(next);
      formRef.current?.querySelector<HTMLInputElement>(next.email ? "#email" : "#password")?.focus();
    }
  };

  return (
    <form ref={formRef} action={action} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {next && next !== "/" ? <input type="hidden" name="next" value={next} /> : null}
      <Fields
        errors={errors}
        validate={validate}
        serverError={Boolean(serverError)}
        notice={serverError ? <Alert variant="error">{serverError}</Alert> : null}
      />
    </form>
  );
}
