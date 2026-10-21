"use client";

// S-4 My space (/my-space): the approved Stitch page, built by the coding task in this file.
// Rebuild the approved Stitch screen here with the kit's components (components/ui, components/blocks) and the theme;
// match its layout, sections and words. Fixture mode (?fixture=S-4:<state>) must show the approved sample content in
// that state with no backend; the states the design drew: Days selected: the side panel lists the chosen dates and the button reads 'Release 2 selected days', Release scheduled: a line 'Released for Wed 22 Oct and Thu 23 Oct.' above the history, Cancellation result: the line returned by the system ('Release for Fri 17 Oct cancelled.' or the refusal) above the history, Loading: skeleton calendar, Error: 'We couldn't load your space. Try again.' with 'Retry', Employee without dedicated parking: an illustration of an empty bay, the line 'You don't have a dedicated space. You can claim a free one for today.' and one link 'Free spaces', Confirm: Cancel this release?.
export function MySpaceContainer({ fixture }: { fixture?: string }) {
  return (
    <main data-screen="S-4" data-state={fixture ?? "default"}>
      <h1>My space</h1>
    </main>
  );
}
