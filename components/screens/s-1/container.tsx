"use client";

// S-1 Sign in (/sign-in): the approved Stitch page, built by the coding task in this file.
// Rebuild the approved Stitch screen here with the kit's components (components/ui, components/blocks) and the theme;
// match its layout, sections and words. Fixture mode (?fixture=S-1:<state>) must show the approved sample content in
// that state with no backend; the states the design drew: Refused: a plain message above the button, 'That email and password don't match. Try again.', fields kept, Access refused: 'This account can't use Folio3 Parking yet.' in the same place, Checking: the button shows 'Signing in' and is disabled, Signed out or asked to sign in: a quiet line above the form, 'You've been signed out.' or 'Sign in to see your parking.', Validation: 'Enter your email' or 'Enter your password' under the empty field.
export function SignInContainer({ fixture }: { fixture?: string }) {
  return (
    <main data-screen="S-1" data-state={fixture ?? "default"}>
      <h1>Sign in</h1>
    </main>
  );
}
