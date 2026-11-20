import './ts-hook.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'

const { contrast, ensureContrast, mix, onColor, cleanHex } = await import('../../src/lib/theme/color.ts')
const { PRESETS, normalizeTheme, parseThemeSetting, LAYOUT_OPTIONS } = await import('../../src/lib/theme/presets.ts')
const { buildThemeCss, themeColors } = await import('../../src/lib/theme/css.ts')

test('colour maths', () => {
  assert.equal(mix('#000000', '#FFFFFF', 0.5), '#808080')
  assert.equal(Math.round(contrast('#000', '#fff')), 21)
  assert.equal(onColor('#FFD60A'), '#111827')
  assert.equal(onColor('#16A34A'), '#FFFFFF')
  assert.equal(cleanHex('abc', '#000000'), '#AABBCC')
  assert.equal(cleanHex('javascript:alert(1)', '#123456'), '#123456')
  assert.ok(contrast(ensureContrast('#FFD60A', '#FFFFFF', 3.6), '#FFFFFF') >= 3.6)
})

test('every preset is complete and valid', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    assert.deepEqual(normalizeTheme(preset), {
      preset: id, palette: preset.palette, font: preset.font, radius: preset.radius, decor: preset.decor,
      chrome: preset.chrome, layout: preset.layout, home: preset.home,
    }, id)
    for (const key of Object.keys(LAYOUT_OPTIONS)) assert.ok(preset.layout[key] in LAYOUT_OPTIONS[key].options, `${id}.${key}`)
  }
})

test('text stays readable in every preset', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    const c = themeColors(preset)
    assert.ok(contrast(c.ink, c.bg) >= 7, `${id}: body text on background`)
    assert.ok(contrast(c.ink, c.surface) >= 7, `${id}: body text on cards`)
    assert.ok(contrast(c.onAccent, c.accent) >= 3, `${id}: button label`)
    assert.ok(contrast(c.accentText, c.surface) >= 3.6, `${id}: price on card`)
    assert.ok(contrast(c.chromeFg, c.chromeBg) >= 3, `${id}: header text`)
  }
})

test('the default look is left exactly as it was', () => {
  const setting = parseThemeSetting(null, 'blue')
  assert.equal(setting.published.preset, 'aurora')
  assert.equal(setting.published.palette.accent, '#2563EB')
  const css = buildThemeCss(setting.published)
  assert.match(css, /--clr-primary:#2563EB;--clr-primary-dark:#1D4ED8;--clr-primary-light:#DBEAFE;--clr-primary-bg:#EFF6FF/)
  assert.doesNotMatch(css.split('}')[0], /--color-slate-/)
  assert.doesNotMatch(css, /--radius-/)
})

test('bad input cannot break a theme or inject CSS', () => {
  const t = normalizeTheme({
    preset: 'nope', palette: { dominant: 'red;}body{display:none', accent: '#0f0' }, font: 'x', radius: 7,
    layout: { header: 'sideways' }, home: ['hero', 'hero', 'evil', 'deals'],
  })
  assert.equal(t.preset, 'aurora')
  assert.equal(t.palette.dominant, PRESETS.aurora.palette.dominant)
  assert.equal(t.palette.accent, '#00FF00')
  assert.equal(t.layout.header, 'floating')
  assert.deepEqual(t.home, ['hero', 'deals'])
  assert.doesNotMatch(buildThemeCss(t), /display:none/)
  assert.equal(parseThemeSetting('{not json').published.preset, 'aurora')
})

test('a dark theme mirrors the neutral ramp', () => {
  const css = buildThemeCss(PRESETS.midnight)
  const shade = n => css.match(new RegExp(`--color-slate-${n}:(#[0-9A-F]{6})`))[1]
  assert.ok(contrast(shade(900), PRESETS.midnight.palette.dominant) > 12, 'slate-900 is light text on dark')
  assert.ok(contrast(shade(50), PRESETS.midnight.palette.dominant) < 1.3, 'slate-50 is a faint panel')
  assert.match(css, /color-scheme:dark/)
})
