import type { ScheduleEntry } from '../types'

type Props = {
  entries: ScheduleEntry[]
}

const Summary = ({ entries }: Props) => {
  if (entries.length === 0) {
    return null
  }

  return (
  <section className="summary">
      <div className="summary__schedule">
        {entries.map((entry, index) => (
          <span key={entry.absoluteMinutes + index} className="summary__time">
            <span className="summary__number">{index + 1}</span>
            {entry.label}
          </span>
        ))}
    </div>
  </section>
)
}

export default Summary
