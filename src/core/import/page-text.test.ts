import { parseDocument } from 'htmlparser2'
import { describe, expect, it } from 'vitest'
import { MAX_TEXT, textOfPage } from '@/core/import/page-text'

const text = (html: string) => textOfPage(parseDocument(html))

// A page laid out the way recipe pages without Recipe data are, around the
// name, yield, first ingredients and a step of
// https://www.meillakotona.fi/reseptit/kermainen-kanapata (tests/corpus/).
const PAGE = `<!doctype html>
<html lang="fi"><head><title>Kermainen kanapata</title>
<style>body { color: red }</style>
<script>window.dataLayer = []</script></head>
<body>
<nav><a href="/">Etusivu</a> <a href="/reseptit">Reseptit</a></nav>
<main><article>
<h1>Kermainen kanapata</h1>
<p>4 annosta</p>
<table><tr><td>600 g</td><td>broilerin paistileikkeitä</td></tr><tr><td>1 ps (350 g)</td><td>salottisipuleita (tai muita pikkusipuleita)</td></tr></table>
<ul><li>2–3 <b>valkosipulinkynttä</b></li><li>3 rkl rypsiöljyä</li></ul>
<p>Lisää pataan vesi, kerma ja mausteet ja sekoita.<br>Siirrä pata 225-asteisen uunin alaosaan ja kypsennä 15 minuuttia.</p>
<div hidden>Tulosta resepti</div>
<span aria-hidden="true">★★★★★</span>
<form><input name="q"><button>Hae</button></form>
</article></main>
<aside>Katso myös: Kanakeitto</aside>
<footer>© Meillä kotona</footer>
</body></html>`

describe('textOfPage', () => {
  it('gives what a reader sees, a line for each block', () => {
    expect(text(PAGE).split('\n')).toEqual([
      'Kermainen kanapata',
      '4 annosta',
      '600 g broilerin paistileikkeitä',
      '1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)',
      '2–3 valkosipulinkynttä',
      '3 rkl rypsiöljyä',
      'Lisää pataan vesi, kerma ja mausteet ja sekoita.',
      'Siirrä pata 225-asteisen uunin alaosaan ja kypsennä 15 minuuttia.',
    ])
  })

  it('decodes HTML entities', () => {
    expect(text('<body><p>2&ndash;3 valkosipulinkynttä</p></body>')).toBe(
      '2–3 valkosipulinkynttä',
    )
  })

  it('reads the main part of a page longer than the model is sent', () => {
    const filler = `<p>${'Mainos. '.repeat(MAX_TEXT / 8)}</p>`
    const long = `<body>${filler}<main><p>5 dl vettä</p></main>${filler}</body>`
    expect(text(long)).toBe('5 dl vettä')
  })

  it('cuts a page without a main part at the limit', () => {
    const long = `<body><p>${'a'.repeat(MAX_TEXT * 2)}</p></body>`
    expect(text(long)).toHaveLength(MAX_TEXT)
  })
})
