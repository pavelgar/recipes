import { lines, recipes } from '@/test/corpus'
import type { CorpusFile } from '@/test/corpus'

// Imported dynamically inside the requested evaluation's test callbacks.
// A top-level import from a skipped suite would still read these files.
const files = import.meta.glob<CorpusFile<'ingredients' | 'sentences'>>(
  '/corpus/held-out/*.json',
  { eager: true, import: 'default' },
)

export const heldOutIngredientLines = lines(files, 'ingredients')
export const heldOutStepSentences = lines(files, 'sentences')
export const heldOutRecipes = recipes(files)
