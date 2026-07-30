import type { Params, ScheduleEntry, Volumes } from '../types'
import { formatLiters } from '../utils/formatters'
import { minutesToTimeString } from '../utils/calculations'
import { useAppPreferences } from '../contexts/AppPreferencesContext'

type Props = {
  entries: ScheduleEntry[]
  volumes: Volumes
  params: Params
  windowStart: number
  windowEnd: number
  dailyConsumptionLiters: number
}

const ScheduleTable = ({ entries, volumes, params, windowStart, windowEnd, dailyConsumptionLiters }: Props) => {
  const { language } = useAppPreferences()
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const liters = (value: number) => language === 'ru' ? formatLiters(value) : `${value.toFixed(2)} L`
  // Показываем объемы всегда, но колонку "На растение" только если включены компенсированные капельницы
  const showVolumes = true
  const showPerPlant = params.showCompensatedDripsCard
  
  // Вычисляем объемы: если компенсированные капельницы выключены, используем dailyConsumptionLiters
  const volumePerWatering = params.showCompensatedDripsCard 
    ? volumes.volumePerWatering 
    : dailyConsumptionLiters / params.wateringsPerDay
  
  const volumePerPlant = params.showCompensatedDripsCard
    ? volumes.volumePerPlant
    : 0 // Не используется, если капельницы выключены
  
  // Обновляем entries с правильными объемами
  const entriesWithVolumes = entries.map(entry => ({
    ...entry,
    volumeTotal: volumePerWatering,
    volumePerPlant: volumePerPlant,
  }))
  const intervalMinutes = entries.length > 1 ? entries[1].absoluteMinutes - entries[0].absoluteMinutes : 0
  const intervalLabel =
    entries.length > 1
      ? l(
        `${Math.floor(intervalMinutes / 60)} ч ${Math.round(intervalMinutes % 60)} мин`,
        `${Math.floor(intervalMinutes / 60)} h ${Math.round(intervalMinutes % 60)} min`,
      )
      : '—'

  return (
    <section className="schedule-card">
      <header className="schedule-card__header">
        <div>
          <h2 className="control-card__title">{l('Расписание поливов', 'Watering schedule')}</h2>
          <p className="control-card__description">
            {l('Свет', 'Light')} {params.lightHours}/{24 - params.lightHours} · {l('окно полива', 'watering window')}{' '}
            {minutesToTimeString(windowStart)} – {minutesToTimeString(windowEnd)} ({l('без первых/последних 30 мин', 'excluding the first/last 30 min')}) · {l('интервал', 'interval')} {intervalLabel}
          </p>
        </div>
      </header>
      <div
        className={`schedule-table${showVolumes ? '' : ' schedule-table--time-only'}${!showPerPlant ? ' schedule-table--no-per-plant' : ''}`}
        role="table"
        aria-label={l('Расписание поливов', 'Watering schedule')}
      >
        <div className="schedule-table__head" role="row">
          <div role="columnheader">№</div>
          <div role="columnheader">{l('Время', 'Time')}</div>
          {showVolumes ? <div role="columnheader">{l('За раз', 'Per cycle')}</div> : null}
          {showPerPlant ? <div role="columnheader">{l('На растение', 'Per plant')}</div> : null}
        </div>
        <div className="schedule-table__body">
          {entriesWithVolumes.map((entry, idx) => (
            <div className="schedule-table__row" role="row" key={entry.absoluteMinutes + idx}>
              <div role="cell" className="schedule-table__number">{idx + 1}</div>
              <div role="cell">{entry.label}</div>
              {showVolumes ? <div role="cell" className="schedule-table__volume">{liters(entry.volumeTotal)}</div> : null}
              {showPerPlant ? <div role="cell" className="schedule-table__volume">{liters(entry.volumePerPlant)}</div> : null}
            </div>
          ))}
        </div>
        {showVolumes ? (
          <div className="schedule-table__footer" role="row">
            <div role="cell" className="schedule-table__footer-spacer"></div>
            <div role="cell" className="schedule-table__footer-label">{l('За день', 'Per day')}</div>
            <div role="cell" className="schedule-table__footer-value">{liters(params.showCompensatedDripsCard ? volumes.dailyTotal : dailyConsumptionLiters)}</div>
            {showPerPlant ? <div role="cell" className="schedule-table__footer-value">{liters(volumes.dailyPerPlant)}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ScheduleTable
