"use client";

// S-2 Create an account (/sign-up): the approved Stitch page, built by the coding task in this file.
// Rebuild the approved Stitch screen here with the kit's components (components/ui, components/blocks) and the theme;
// match its layout, sections and words. Fixture mode (?fixture=S-2:<state>) must show the approved sample content in
// that state with no backend; the states the design drew: Refused: 'This email isn't on the Folio3 staff list, so we couldn't create an account.' above the button, fields kept, Checking: the button shows 'Checking your email' and is disabled, Success: the panel says 'Your account is ready.' with one line 'You can sign in now.' and the link 'Sign in', Validation: 'Enter your full name', 'Enter a work email', 'Use at least 8 characters' under the field.
export function CreateAnAccountContainer({ fixture }: { fixture?: string }) {
  return (
    <main data-screen="S-2" data-state={fixture ?? "default"}>
      <h1>Create an account</h1>
    </main>
  );
}
