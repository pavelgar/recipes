import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { MarkedTextarea } from '@/components/marked-textarea'
import { marksOf } from '@/lib/editor/lines'
import type { LineKind, LineOptions } from '@/lib/editor/lines'

// The list a textarea reads as: its bullets or step numbers, and what the
// app recognised, drawn behind the text. The lines are from
// https://kotiliesi.fi/resepti/etikkasilakat/ (tests/corpus/).

const FINNISH: LineOptions = { language: 'fi', system: 'metric' }

async function renderList(
  value: string,
  list: 'bullets' | 'numbers',
  opts: LineOptions = FINNISH,
  flagged?: (line: string) => boolean,
  placeholder?: string,
) {
  const kind: LineKind = list === 'bullets' ? 'ingredient' : 'step'
  const screen = await render(
    <MarkedTextarea
      aria-label="List"
      value={value}
      list={list}
      marksOf={(line) => marksOf(line, kind, opts)}
      flagged={flagged}
      placeholder={placeholder}
      onChange={() => {}}
    />,
  )
  // The copy has no roles to find it by: it's hidden from screen readers,
  // which read the textarea. Its markers and marks are found by their
  // classes.
  const copy = screen.container.querySelector('[aria-hidden]')
  if (!copy) throw new Error('No copy behind the textarea')
  const lines = [...copy.children].map((line) => ({
    marker: line.querySelector('.absolute')?.textContent ?? null,
    marked: [...line.querySelectorAll('.rounded-sm')].map((m) => m.textContent),
    flagged: line.classList.contains('decoration-wavy'),
  }))
  return { screen, lines }
}

describe('MarkedTextarea', () => {
  it('marks the amounts it recognises and the section headings', async () => {
    const { lines } = await renderList(
      '1  sipuli\n  korppujauhoja\nEtikkaliemi:\n1 dl etikkaa',
      'bullets',
    )
    expect(lines).toEqual([
      { marker: '•', marked: ['1'], flagged: false },
      { marker: '•', marked: [], flagged: false },
      { marker: null, marked: ['Etikkaliemi:'], flagged: false },
      { marker: '•', marked: ['1 dl'], flagged: false },
    ])
  })

  it('numbers steps again after each heading', async () => {
    const { lines } = await renderList(
      'Paista silakat.\nAsettele purkkiin.\nEtikkaliemi:\nKiehauta liemi.',
      'numbers',
    )
    expect(lines.map((line) => line.marker)).toEqual(['1.', '2.', null, '1.'])
  })

  it('marks nothing in a language the app has no rules for', async () => {
    const { lines } = await renderList('1 dl ättika', 'bullets', {
      language: null,
      system: 'metric',
    })
    expect(lines).toEqual([{ marker: '•', marked: [], flagged: false }])
  })

  it('underlines the lines to check', async () => {
    const { lines } = await renderList(
      '1  sipuli\n2 rkl voita',
      'bullets',
      FINNISH,
      (line) => line === '2 rkl voita',
    )
    expect(lines.map((line) => line.flagged)).toEqual([false, true])
  })

  it('shows its placeholder as the list, with nothing to check', async () => {
    const { screen, lines } = await renderList(
      '',
      'bullets',
      FINNISH,
      () => true,
      '1  sipuli\n2 rkl voita',
    )
    expect(lines).toEqual([
      { marker: '•', marked: ['1'], flagged: false },
      { marker: '•', marked: ['2 rkl'], flagged: false },
    ])
    await expect.element(screen.getByRole('textbox')).toHaveValue('')
  })
})
