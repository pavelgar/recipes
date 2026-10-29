import { MAX_TEXT } from '@/core/ai/limits'
import { DomUtils, ElementType } from 'htmlparser2'
import type { Element, Page } from '@/core/import/schema-org'

export { MAX_TEXT } from '@/core/ai/limits'

// What a page shows a reader, as text with a line for each paragraph, list
// item, heading or table row, for AI to read a recipe from when the page
// has no Recipe data. Scripts, styles, menus, footers, forms and hidden
// parts are left out: they hold no recipe and only cost the model time.

// Elements whose text is never the recipe.
const SKIPPED = new Set([
  'aside',
  'audio',
  'button',
  'canvas',
  'footer',
  'form',
  'head',
  'iframe',
  'nav',
  'noscript',
  'object',
  'picture',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
  'video',
])

// Elements that start a line and end one.
const BLOCKS = new Set([
  'address',
  'article',
  'blockquote',
  'caption',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'tfoot',
  'thead',
  'tr',
  'ul',
])

// A table's cells stay on their row's line: an amount in one cell and its
// ingredient in the next are one ingredient.
const CELLS = new Set(['td', 'th'])

export function textOfPage(page: Page): string {
  const body =
    DomUtils.findOne((element) => element.name === 'body', page.children) ??
    page
  const text = linesOf(body).join('\n')
  if (text.length <= MAX_TEXT) return text
  const main = DomUtils.findOne(
    (element) =>
      element.name === 'main' ||
      DomUtils.getAttributeValue(element, 'role') === 'main',
    body.children,
  )
  const mainText = main ? linesOf(main).join('\n') : text
  return mainText.slice(0, MAX_TEXT)
}

function linesOf(root: Page | Element): Array<string> {
  const lines: Array<string> = []
  let line = ''
  const end = () => {
    const text = line.replace(/\s+/g, ' ').trim()
    // A line said twice in a row, as a heading and its link can be, once.
    if (text !== '' && text !== lines.at(-1)) lines.push(text)
    line = ''
  }
  const visit = (node: Page['children'][number]) => {
    if (node.type === ElementType.Text) {
      line += node.data
      return
    }
    if (!isElement(node) || hidden(node)) return
    if (node.name === 'br') {
      end()
      return
    }
    const block = BLOCKS.has(node.name)
    if (block) end()
    for (const child of node.children) visit(child)
    if (block) end()
    else if (CELLS.has(node.name)) line += ' '
  }
  for (const child of root.children) visit(child)
  end()
  return lines
}

function isElement(node: Page['children'][number]): node is Element {
  return (
    node.type === ElementType.Tag ||
    node.type === ElementType.Script ||
    node.type === ElementType.Style
  )
}

function hidden(element: Element): boolean {
  return (
    SKIPPED.has(element.name) ||
    DomUtils.hasAttrib(element, 'hidden') ||
    DomUtils.getAttributeValue(element, 'aria-hidden') === 'true'
  )
}
