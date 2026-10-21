"use client";

// S-5 Free spaces (/free-spaces): the approved Stitch page, built by the coding task in this file.
// Rebuild the approved Stitch screen here with the kit's components (components/ui, components/blocks) and the theme;
// match its layout, sections and words. Fixture mode (?fixture=S-5:<state>) must show the approved sample content in
// that state with no backend; the states the design drew: Claim accepted: the counter area becomes 'You have a space on Floor 3' with a floor line-icon showing '3', the plate badge 'AWC-917' and the line 'No numbered bay. Park anywhere on Floor 3.' No cancel control, No plate registered: illustration of a car and a plate, 'Add your vehicle to claim a space', and the Add a vehicle button as the one action; Claim a space disabled, Nothing free: illustration of a full car park, the counter shows '0', 'No spaces are free right now', no button, Claim refused: the returned reason in a plain message, 'No space could be claimed. The last free space was taken just now.', no success shown, Loading: skeleton counter and chart, Error: 'We couldn't load free spaces. Try again.' with 'Retry', Sheet: Choose your car, Dialog: Add your vehicle.
export function FreeSpacesContainer({ fixture }: { fixture?: string }) {
  return (
    <main data-screen="S-5" data-state={fixture ?? "default"}>
      <h1>Free spaces</h1>
    </main>
  );
}
