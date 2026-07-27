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

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DripCalc//Calendar Event//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
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
  link.download = `напоминание-${date.toISOString().split('T')[0]}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
