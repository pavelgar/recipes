// Ingredient lines or steps under an optional heading ("For the sauce"). A
// recipe without sections has one section, with no heading. Each line is
// one ingredient line or one step, kept exactly as written: recognition,
// scaling and conversion happen when the recipe is shown.
export type Section = {
  readonly heading: string | null
  readonly lines: ReadonlyArray<string>
}
