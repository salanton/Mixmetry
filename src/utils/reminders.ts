/**
 * Создает iCalendar файл для добавления события в календарь
 * Пользователь может затем создать напоминание на основе этого события
 */
export function createCalendarEvent(
  title: string,
  date: Date,
  description?: string
): string {
  // Форматируем дату для iCalendar (только дата, без времени)
  const formatDate = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  const escapeText = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n')

  const startDate = formatDate(date)
  const end = new Date(date)
  end.setDate(end.getDate() + 1)
  const endDate = formatDate(end)
  const escapedTitle = escapeText(title)
  const uid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${crypto.randomUUID()}@mixmetry.app`
    : `${Date.now()}-${Math.random().toString(36).slice(2)}@mixmetry.app`
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mixmetry//Calendar Event//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapedTitle}`,
    description ? `DESCRIPTION:${escapeText(description)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapedTitle}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter((line) => line !== '')
    .join('\r\n')

  return icsContent
}

/**
 * Скачивает iCalendar файл
 */
export function downloadCalendarFile(
  title: string,
  date: Date,
  description?: string
): void {
  const icsContent = createCalendarEvent(title, date, description)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const filenamePrefix = document.documentElement.lang === 'en' ? 'reminder' : 'напоминание'
  link.download = `${filenamePrefix}-${localDate}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
