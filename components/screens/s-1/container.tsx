"use client";

// S-1 Sign in (/sign-in): the approved Stitch page, built by the coding task in this file.
// Fixture mode keeps each approved state local and never calls the account service.
import { useState, type FormEvent } from "react";
import { login } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNav } from "@/lib/nav";
import { storeAccessToken } from "@/lib/auth/session";

function fixtureKind(fixture: string | undefined, name: string): boolean {
  return fixture?.toLowerCase().includes(name) ?? false;
}

export function SignInContainer({ fixture }: { fixture?: string }) {
  const { go, param } = useNav();
  const isFixture = fixture !== undefined;
  const sampleCredentials = isFixture && /refused|checking/i.test(fixture);
  const [email, setEmail] = useState(sampleCredentials ? "ayesha.malik@folio3.com" : "");
  const [password, setPassword] = useState(sampleCredentials ? "Parking2025!" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(fixtureKind(fixture, "checking"));
  const [emailError, setEmailError] = useState(fixtureKind(fixture, "validation") ? "Enter your email" : "");
  const [passwordError, setPasswordError] = useState(fixtureKind(fixture, "validation") ? "Enter your password" : "");
  const [serverMessage, setServerMessage] = useState("");

  const fixtureMessage = fixtureKind(fixture, "access-refused")
    ? "This account can't use Folio3 Parking yet."
    : fixtureKind(fixture, "refused")
      ? "That email and password don't match. Try again."
      : "";
  const status = param("status");
  const quietMessage = fixtureKind(fixture, "signed-out") || status === "signed-out"
    ? "You've been signed out."
    : fixtureKind(fixture, "sign-in-to-see-your-parking") || status === "sign-in"
      ? "Sign in to see your parking."
      : "";
  const message = fixtureMessage || serverMessage;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isFixture || checking) return;

    const nextEmailError = email.trim() ? "" : "Enter your email";
    const nextPasswordError = password ? "" : "Enter your password";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setServerMessage("");
    if (nextEmailError || nextPasswordError) return;

    setChecking(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result.status === 200) {
        storeAccessToken(result.data.accessToken, result.data.expiresIn);
        const destination = result.data.employee.role === "gateGuard"
          ? "/gate"
          : result.data.employee.role === "parkingAdministrator"
            ? "/admin/entry-records"
            : "/dashboard";
        go(destination);
        return;
      }
      setServerMessage(result.status === 403
        ? "This account can't use Folio3 Parking yet."
        : result.status === 401
          ? "That email and password don't match. Try again."
          : "Sign in to continue.");
    } catch {
      setServerMessage("We couldn't sign you in. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const displayedChecking = checking || fixtureKind(fixture, "checking");

  return (
    <main data-screen="S-1" data-state={fixture ?? "default"} className="flex min-h-dvh w-full flex-col md:flex-row">
      <div role="img" aria-label="Illustration of a parking garage" className="relative h-44 shrink-0 overflow-hidden bg-muted sm:h-56 md:h-dvh md:w-1/2">
        <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-end gap-3 bg-gradient-to-b from-muted to-secondary p-6 sm:p-10">
          <div className="flex items-end justify-center gap-3">
            <div className="h-16 flex-1 rounded-t-md border-2 border-dashed border-primary/30 bg-card/60" />
            <div className="relative flex h-16 flex-1 items-center justify-center rounded-t-md border-2 border-dashed border-primary/30 bg-card/60">
              <div className="flex h-8 w-24 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <span className="h-3 w-14 rounded-full bg-primary-foreground/80" />
              </div>
            </div>
            <div className="h-16 flex-1 rounded-t-md border-2 border-dashed border-primary/30 bg-card/60" />
          </div>
          <div className="h-5 rounded-sm bg-secondary" />
        </div>
      </div>

      <section className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 md:w-1/2 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 select-none">
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-base font-semibold leading-none text-primary-foreground">F</span>
            <span className="font-heading text-xl font-semibold leading-tight tracking-tight">Folio3 Parking</span>
          </div>

          <Card className="w-full rounded-lg p-6">
            <h1 className="mb-2 font-heading text-3xl font-semibold leading-tight tracking-tight">Sign in</h1>
            <p className="mb-6 leading-normal text-muted-foreground">Use your Folio3 email to see your parking.</p>

            {quietMessage && <p role="status" className="mb-4 text-sm text-muted-foreground">{quietMessage}</p>}

            <form noValidate onSubmit={submit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-in-email">Email</Label>
                <Input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  className="font-mono"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setEmailError(""); }}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? "sign-in-email-error" : undefined}
                />
                {emailError && <p id="sign-in-email-error" className="text-sm text-destructive">{emailError}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sign-in-password">Password</Label>
                  <Button type="button" variant="ghost" size="sm" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="px-1 text-sm font-normal text-muted-foreground">Show</Button>
                </div>
                <Input
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? "sign-in-password-error" : undefined}
                />
                {passwordError && <p id="sign-in-password-error" className="text-sm text-destructive">{passwordError}</p>}
              </div>

              {message && <p role="alert" className="text-sm text-destructive">{message}</p>}

              <div className="pt-2">
                <Button type="submit" disabled={displayedChecking} className="w-full">{displayedChecking ? "Signing in" : "Sign in"}</Button>
              </div>
            </form>

            <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
              <span>New here?</span>
              <Link to="/sign-up" className="ml-1.5 font-medium text-foreground hover:underline">Create an account</Link>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
