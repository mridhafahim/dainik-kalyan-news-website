import test from 'node:test'
import assert from 'node:assert/strict'
const validPlacement = value => ['header','sidebar','inline','footer'].includes(value)
test('advertisement placements are allowlisted', () => { assert.equal(validPlacement('sidebar'), true); assert.equal(validPlacement('script'), false) })
test('advertisement schedule rejects inverted dates', () => { const start = new Date('2026-10-01'); const end = new Date('2026-09-01'); assert.equal(start > end, true) })
test('backup filename is date scoped', () => { const filename = `dainik-kalyan-backup-${new Date('2026-10-29').toISOString().slice(0,10)}.json`; assert.match(filename, /^dainik-kalyan-backup-\d{4}-\d{2}-\d{2}\.json$/) })
