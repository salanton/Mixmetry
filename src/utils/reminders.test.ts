import { describe, expect, it } from 'vitest'
import { createCalendarEvent } from './reminders'

describe('createCalendarEvent', () => {
  it('creates a one-day all-day event with an exclusive end date', () => {
    const ics = createCalendarEvent('Наполнить бак', new Date(2026, 6, 27))

    expect(ics).toContain('DTSTART;VALUE=DATE:20260727')
    expect(ics).toContain('DTEND;VALUE=DATE:20260728')
  })

  it('rolls the end date into the next month and year', () => {
    const ics = createCalendarEvent('Наполнить бак', new Date(2026, 11, 31))

    expect(ics).toContain('DTSTART;VALUE=DATE:20261231')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
  })

  it('escapes reserved iCalendar text characters', () => {
    const ics = createCalendarEvent('Бак, 20л; основной', new Date(2026, 6, 27), 'Строка 1\nПуть \\ бак')

    expect(ics).toContain('SUMMARY:Бак\\, 20л\\; основной')
    expect(ics).toContain('DESCRIPTION:Строка 1\\nПуть \\\\ бак')
  })
})
