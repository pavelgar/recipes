// About 15,000 tokens: room for a long recipe without overwhelming a
// local model. Shared by page extraction, pasted text and Tidy steps.
export const MAX_TEXT = 60_000

// Photos of one recipe, read together as its pages: a recipe rarely runs
// over more than two, and each photo adds to how long the model takes.
export const MAX_PHOTOS = 5

// What the server takes of one photo. The browser sends each shrunk, a few
// hundred kilobytes; this leaves room for a detailed page.
export const MAX_PHOTO_BYTES = 10_000_000
