import type { Params, ScheduleEntry, Volumes } from '../types'
import { formatLiters } from '../utils/formatters'
import { minutesToTimeString } from '../utils/calculations'

type Props = {
  entries: ScheduleEntry[]
  volumes: Volumes
  params: Params
  windowStart: number
  windowEnd: number
  dailyConsumptionLiters: number
}

const ScheduleTable = ({ entries, volumes, params, windowStart, windowEnd, dailyConsumptionLiters }: Props) => {
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
      ? `${Math.floor(intervalMinutes / 60)} ч ${Math.round(intervalMinutes % 60)} мин`
      : '—'

  return (
    <section className="schedule-card">
      <header className="schedule-card__header">
        <div>
          <h2 className="control-card__title">Расписание поливов</h2>
          <p className="control-card__description">
            Свет {params.lightHours}/{24 - params.lightHours} · окно полива{' '}
            {minutesToTimeString(windowStart)} – {minutesToTimeString(windowEnd)} (без первых/последних
            30 мин) · интервал {intervalLabel}
          </p>
        </div>
      </header>
      <div
        className={`schedule-table${showVolumes ? '' : ' schedule-table--time-only'}${!showPerPlant ? ' schedule-table--no-per-plant' : ''}`}
        role="table"
        aria-label="Расписание поливов"
      >
        <div className="schedule-table__head" role="row">
          <div role="columnheader">№</div>
          <div role="columnheader">Время</div>
          {showVolumes ? <div role="columnheader">За раз</div> : null}
          {showPerPlant ? <div role="columnheader">На растение</div> : null}
        </div>
        <div className="schedule-table__body">
          {entriesWithVolumes.map((entry, idx) => (
            <div className="schedule-table__row" role="row" key={entry.absoluteMinutes + idx}>
              <div role="cell" className="schedule-table__number">{idx + 1}</div>
              <div role="cell">{entry.label}</div>
              {showVolumes ? <div role="cell" className="schedule-table__volume">{formatLiters(entry.volumeTotal)}</div> : null}
              {showPerPlant ? <div role="cell" className="schedule-table__volume">{formatLiters(entry.volumePerPlant)}</div> : null}
            </div>
          ))}
        </div>
        {showVolumes ? (
          <div className="schedule-table__footer" role="row">
            <div role="cell" className="schedule-table__footer-spacer"></div>
            <div role="cell" className="schedule-table__footer-label">За день</div>
            <div role="cell" className="schedule-table__footer-value">{formatLiters(params.showCompensatedDripsCard ? volumes.dailyTotal : dailyConsumptionLiters)}</div>
            {showPerPlant ? <div role="cell" className="schedule-table__footer-value">{formatLiters(volumes.dailyPerPlant)}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ScheduleTable
