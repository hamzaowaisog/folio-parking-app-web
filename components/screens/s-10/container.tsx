"use client";

// S-10 Unused spaces (/admin/unused-spaces): the approved Stitch page, built by the coding task in this file.
// Rebuild the approved Stitch screen here with the kit's components (components/ui, components/blocks) and the theme;
// match its layout, sections and words. Fixture mode (?fixture=S-10:<state>) must show the approved sample content in
// that state with no backend; the states the design drew: Filtered by category: only Dedicated or only Temporary rows with the count updated, Loading: skeleton rows, Error: 'We couldn't load unused spaces. Try again.' with 'Retry', Empty: illustration of an empty bay and 'No unused spaces in these dates', one action 'Clear filters'.
export function UnusedSpacesContainer({ fixture }: { fixture?: string }) {
  return (
    <main data-screen="S-10" data-state={fixture ?? "default"}>
      <h1>Unused spaces</h1>
    </main>
  );
}
