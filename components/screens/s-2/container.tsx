"use client";

// S-2 Create an account (/sign-up): the approved Stitch page, built by the coding task in this file.
// Fixture mode keeps each approved state local and never calls the account service.
import { useState, type FormEvent } from "react";
import { registerAccount } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/lib/nav";

function fixtureKind(fixture: string | undefined, name: string): boolean {
  return fixture?.toLowerCase().includes(name) ?? false;
}

const refusalMessage = "This email isn't on the Folio3 staff list, so we couldn't create an account.";

export function CreateAnAccountContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const sampleFields = isFixture && /refused|checking/i.test(fixture);
  const [name, setName] = useState(sampleFields ? "Nadia Farooq" : "");
  const [email, setEmail] = useState(sampleFields ? "nadia.farooq@folio3.com" : "");
  const [password, setPassword] = useState(sampleFields ? "SecureParking2026" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(fixtureKind(fixture, "checking"));
  const [nameError, setNameError] = useState(fixtureKind(fixture, "validation") ? "Enter your full name" : "");
  const [emailError, setEmailError] = useState(fixtureKind(fixture, "validation") ? "Enter a work email" : "");
  const [passwordError, setPasswordError] = useState(fixtureKind(fixture, "validation") ? "Use at least 8 characters" : "");
  const [serverMessage, setServerMessage] = useState("");

  const fixtureRefused = fixtureKind(fixture, "refused");
  const success = fixtureKind(fixture, "success") || serverMessage === "success";
  const message = fixtureRefused ? refusalMessage : serverMessage && serverMessage !== "success" ? serverMessage : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isFixture || checking) return;

    const nextNameError = name.trim() ? "" : "Enter your full name";
    const nextEmailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Enter a work email";
    const nextPasswordError = password.length >= 8 ? "" : "Use at least 8 characters";
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setServerMessage("");
    if (nextNameError || nextEmailError || nextPasswordError) return;

    setChecking(true);
    try {
      const result = await registerAccount({ name: name.trim(), email: email.trim(), password });
      if (result.status === 201) {
        setServerMessage("success");
      } else {
        setServerMessage(result.data.message || refusalMessage);
      }
    } catch {
      setServerMessage("We couldn't create your account. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const displayedChecking = checking || fixtureKind(fixture, "checking");

  return (
    <main data-screen="S-2" data-state={fixture ?? (success ? "success" : "default")} className="flex min-h-dvh w-full flex-col md:flex-row">
      <div role="img" aria-label="Office car park" className="relative h-44 shrink-0 overflow-hidden bg-muted sm:h-56 md:h-dvh md:w-1/2">
        <img src="/images/car-park-ramp.jpg" alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
      </div>

      <section className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 md:w-1/2 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 select-none">
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-base font-semibold leading-none text-primary-foreground">F</span>
            <span className="font-heading text-xl font-semibold leading-tight tracking-tight">Folio3 Parking</span>
          </div>

          <Card className="w-full rounded-lg p-6">
            {success ? (
              <div className="text-center">
                <h1 className="mb-2 font-heading text-3xl font-semibold leading-tight tracking-tight">Your account is ready.</h1>
                <p className="mb-6 leading-normal text-muted-foreground">You can sign in now.</p>
                <Link to="/sign-in" className="font-medium text-primary hover:underline">Sign in</Link>
              </div>
            ) : (
              <>
                <h1 className="mb-2 font-heading text-3xl font-semibold leading-tight tracking-tight">Create an account</h1>
                <p className="mb-6 leading-normal text-muted-foreground">Folio3 staff only. We check your email against the staff list.</p>

                <form noValidate onSubmit={submit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sign-up-name">Full name</Label>
                    <Input
                      id="sign-up-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => { setName(event.target.value); setNameError(""); }}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={nameError ? "sign-up-name-error" : undefined}
                    />
                    {nameError && <p id="sign-up-name-error" className="text-sm text-destructive">{nameError}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sign-up-email">Work email</Label>
                    <Input
                      id="sign-up-email"
                      type="email"
                      autoComplete="email"
                      className="font-mono"
                      value={email}
                      onChange={(event) => { setEmail(event.target.value); setEmailError(""); }}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? "sign-up-email-error" : undefined}
                    />
                    {emailError && <p id="sign-up-email-error" className="text-sm text-destructive">{emailError}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sign-up-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="sign-up-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="pr-16"
                        value={password}
                        onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }}
                        aria-invalid={passwordError ? true : undefined}
                        aria-describedby={passwordError ? "sign-up-password-error" : "sign-up-password-hint"}
                      />
                      <Button type="button" variant="ghost" size="sm" aria-label="Show password" aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-sm font-normal text-muted-foreground">Show</Button>
                    </div>
                    {passwordError
                      ? <p id="sign-up-password-error" className="text-sm text-destructive">{passwordError}</p>
                      : <p id="sign-up-password-hint" className="mt-0.5 text-sm text-muted-foreground">At least 8 characters</p>}
                  </div>

                  {message && <p role="alert" className="text-sm text-destructive">{message}</p>}

                  <div className="pt-2">
                    <Button type="submit" disabled={displayedChecking} className="w-full">{displayedChecking ? "Checking your email" : "Create my account"}</Button>
                  </div>
                </form>

                <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
                  <span>Already have an account?</span>
                  <Link to="/sign-in" className="ml-1.5 font-medium text-foreground hover:underline">Sign in</Link>
                </div>
              </>
            )}
          </Card>
        </div>
      </section>
    </main>
  );
}
