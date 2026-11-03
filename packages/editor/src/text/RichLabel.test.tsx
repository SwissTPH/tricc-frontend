import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { DisplayText } from '@tricc/core'
import { RichLabel, labelText } from './RichLabel.js'

const html = (text: DisplayText) => render(<RichLabel text={text} />).container.innerHTML

describe('RichLabel', () => {
  it('shows plain text as it is', () => {
    expect(html('Weight < 2 kg & falling')).toBe('Weight &lt; 2 kg &amp; falling')
  })

  it('renders the formatting of a display text', () => {
    expect(
      html({
        type: 'message',
        children: [
          { type: 'mark', kind: 'strong', children: [{ type: 'text', value: 'Danger' }] },
          { type: 'break' },
          {
            type: 'mark',
            kind: 'color',
            color: '#ff0000',
            children: [{ type: 'text', value: 'refer <now>' }],
          },
        ],
      }),
    ).toBe(
      '<strong>Danger</strong><br><span style="color: rgb(255, 0, 0);">refer &lt;now&gt;</span>',
    )
  })

  it('renders inline HTML, also when it wraps an injected value', () => {
    const text: DisplayText = {
      type: 'message',
      children: [
        { type: 'text', value: '<span style="color:red; font-weight:bold">Warning symptoms on: ' },
        { type: 'interp', name: 't_date' },
        { type: 'text', value: '</span>' },
      ],
    }
    expect(html(text)).toBe(
      '<span style="color: red; font-weight: bold;">Warning symptoms on: ${t_date}</span>',
    )
    expect(labelText(text)).toBe('Warning symptoms on: ${t_date}')
  })

  it('maps tags and keeps lists', () => {
    expect(html('<b>a</b> <i>b</i> <font color="blue">c</font><ul><li>d</li></ul>')).toBe(
      '<strong>a</strong> <em>b</em> <span style="color: blue;">c</span><ul><li>d</li></ul>',
    )
  })

  it('keeps only formatting: no scripts, handlers, links, pictures or other styles', () => {
    const out = html(
      '<b onclick="alert(1)">x</b><script>alert(1)</script><img src=x onerror="alert(1)">' +
        '<a href="javascript:alert(1)">link</a><span style="background:url(x); position:fixed; color:expression(1)">y</span><div>z</div>',
    )
    expect(out).toBe('<strong>x</strong>linky<span class="tricc-rich__block">z</span>')
  })
})
