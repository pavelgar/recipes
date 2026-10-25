import { DomUtils, ElementType } from 'htmlparser2'
import { isOfType } from '@/lib/import/schema-org'
import type { Element, Page, Thing } from '@/lib/import/schema-org'

// The page's schema.org Recipe in microdata (itemscope, itemtype and
// itemprop attributes), read into the shape JSON-LD gives, so one reader
// handles both. None of the corpus sites use microdata, but some sites do.
export function findMicrodataRecipe(page: Page): Thing | null {
  const scope = DomUtils.findOne(
    (element) =>
      DomUtils.hasAttrib(element, 'itemscope') &&
      isOfType({ '@type': itemTypes(element) }, 'Recipe'),
    page.children,
  )
  return scope ? readItem(scope, 0) : null
}

function readItem(scope: Element, depth: number): Thing {
  const item: Record<string, Array<unknown>> = { '@type': itemTypes(scope) }
  const collect = (element: Element) => {
    for (const child of element.children) {
      if (!isElement(child)) continue
      const names = tokens(DomUtils.getAttributeValue(child, 'itemprop'))
      const nested = DomUtils.hasAttrib(child, 'itemscope')
      if (names.length > 0) {
        const value =
          nested && depth < 8 ? readItem(child, depth + 1) : valueOf(child)
        for (const name of names) {
          // A property may be named by its full URL.
          const property = name.replace(/^.*[/#]/, '')
          ;(item[property] ??= []).push(value)
        }
      }
      // A nested item's properties belong to it, not to this one.
      if (!nested) collect(child)
    }
  }
  collect(scope)
  return item
}

// A property's value, where HTML says it is for each kind of element.
function valueOf(element: Element): string {
  const attribute = (name: string) =>
    DomUtils.getAttributeValue(element, name) ?? ''
  // Text keeps its markup, so the reader splits lines where the page
  // breaks them (<br>, paragraphs, list items), as in JSON-LD text. The
  // line breaks of the HTML source are only spacing.
  const text = () => DomUtils.getInnerHTML(element).replace(/\s+/g, ' ')
  switch (element.name) {
    case 'meta':
      return attribute('content')
    case 'a':
    case 'area':
    case 'link':
      return attribute('href')
    case 'audio':
    case 'embed':
    case 'iframe':
    case 'img':
    case 'source':
    case 'track':
    case 'video':
      return attribute('src')
    case 'object':
      return attribute('data')
    case 'data':
    case 'meter':
      return attribute('value')
    case 'time':
      return attribute('datetime') || text()
    default:
      return text()
  }
}

function isElement(node: Element['children'][number]): node is Element {
  return ElementType.isTag(node)
}

function itemTypes(element: Element): Array<string> {
  return tokens(DomUtils.getAttributeValue(element, 'itemtype'))
}

function tokens(attribute: string | undefined): Array<string> {
  return attribute?.split(/\s+/).filter(Boolean) ?? []
}
