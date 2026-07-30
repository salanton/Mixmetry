import { useMemo } from 'react'
import ControlCard from '../components/ControlCard'
import ControlsGrid from '../components/ControlsGrid'
import InstallHint from '../components/InstallHint'
import ScheduleTable from '../components/ScheduleTable'
import SliderInput from '../components/SliderInput'
import Summary from '../components/Summary'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { PARAM_LIMITS, usePersistentParams } from '../hooks/usePersistentParams'
import {
  calcSchedule,
  calcVolumes,
  EDGE_OFFSET_MIN,
  minutesToTimeString,
  timeStringToMinutes,
} from '../utils/calculations'
import { downloadCalendarFile } from '../utils/reminders'

type CalculatorPageProps = ReturnType<typeof usePersistentParams>

const CalculatorPage = ({ params, updateParam }: CalculatorPageProps) => {
  const { language } = useAppPreferences()
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const volumes = useMemo(() => calcVolumes(params), [params])
  const schedule = useMemo(() => calcSchedule(params, volumes), [params, volumes])
  const maxWateringsPerDay = params.unlimitedWaterings ? PARAM_LIMITS.wateringsPerDay.max : 4

  const dailyConsumption = params.showCompensatedDripsCard
    ? volumes.dailyTotal
    : params.dailyConsumptionLiters

  const daysUntilRefill = dailyConsumption > 0 ? params.tankVolumeLiters / dailyConsumption : 0
  const daysUntilRefillRounded = Math.max(0, Math.round(daysUntilRefill))
  const nextRefillDate = new Date()
  nextRefillDate.setDate(nextRefillDate.getDate() + daysUntilRefillRounded)
  const nextRefillDateLabel = nextRefillDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
  })
  const daysWord = language === 'en'
    ? (daysUntilRefillRounded === 1 ? 'day' : 'days')
    : daysUntilRefillRounded % 10 === 1 && daysUntilRefillRounded % 100 !== 11
      ? 'день'
      : daysUntilRefillRounded % 10 >= 2
          && daysUntilRefillRounded % 10 <= 4
          && (daysUntilRefillRounded % 100 < 12 || daysUntilRefillRounded % 100 > 14)
        ? 'дня'
        : 'дней'

  const handleUnlimitedToggle = (checked: boolean) => {
    updateParam('unlimitedWaterings', checked)
    if (!checked && params.wateringsPerDay > 4) {
      updateParam('wateringsPerDay', 4)
    }
  }

  const handleCreateReminder = () => {
    const reminderTitle = l(`Наполнить бак (${params.tankVolumeLiters} л)`, `Refill tank (${params.tankVolumeLiters} L)`)
    const reminderDescription = l('Следующее наполнение бака автополива', 'Next irrigation tank refill')
    downloadCalendarFile(reminderTitle, nextRefillDate, reminderDescription)
  }

  return (
    <>
      <InstallHint />
      {params.showCompensatedDripsCard ? <Summary entries={schedule.entries} /> : null}

      <ControlsGrid>
        <ControlCard
          className="control-card--mode"
          title={l('Световой режим растений', 'Plant light cycle')}
          description={l('Часы света и время включения', 'Light hours and start time')}
        >
          <SliderInput
            showHeader={false}
            displayValue={`${params.lightHours}/${24 - params.lightHours}`}
            value={params.lightHours}
            min={PARAM_LIMITS.lightHours.min}
            max={PARAM_LIMITS.lightHours.max}
            step={1}
            onChange={(value) => updateParam('lightHours', value)}
            helper={l(`Свет: ${params.lightHours} ч · Тьма: ${24 - params.lightHours} ч`, `Light: ${params.lightHours} h · Dark: ${24 - params.lightHours} h`)}
          />
          <SliderInput
            showHeader={false}
            value={timeStringToMinutes(params.lampOnTime)}
            min={0}
            max={23 * 60 + 45}
            step={15}
            displayValue={params.lampOnTime}
            helper={l('Время включения света', 'Lights on time')}
            onChange={(value) => updateParam('lampOnTime', minutesToTimeString(value))}
          />
        </ControlCard>

        <ControlCard
          className="control-card--waterings"
          title={l('Частота и количество поливов', 'Watering frequency')}
          description={l('Количество включений и длительность', 'Number and duration of cycles')}
        >
          <SliderInput
            showHeader={false}
            value={params.durationMinutes}
            min={PARAM_LIMITS.durationMinutes.min}
            max={PARAM_LIMITS.durationMinutes.max}
            step={1}
            suffix={l('мин', 'min')}
            helper={l('Минуты за раз', 'Minutes per cycle')}
            onChange={(value) => updateParam('durationMinutes', value)}
          />
          <SliderInput
            showHeader={false}
            value={params.wateringsPerDay}
            min={PARAM_LIMITS.wateringsPerDay.min}
            max={maxWateringsPerDay}
            step={1}
            helper={l('Количество включений', 'Number of cycles')}
            onChange={(value) => updateParam('wateringsPerDay', value)}
          />
        </ControlCard>

        <ControlCard title={l('Опции', 'Options')} description={l('Дополнительные параметры', 'Additional parameters')}>
          <label className="toggle-row toggle-row--switch" htmlFor="correctWatering">
            <input
              id="correctWatering"
              type="checkbox"
              className="toggle-switch"
              checked={params.correctWatering}
              onChange={(event) => updateParam('correctWatering', event.target.checked)}
            />
            <span className="toggle-switch__slider" aria-hidden="true" />
            <div className="toggle-row__text">
              <div className="toggle-row__title">{l('Правильный полив', 'Light-window watering')}</div>
              <p className="toggle-row__desc">
                {l(`Только в световом окне, без первых и последних ${EDGE_OFFSET_MIN} мин.`, `Only during the light window, excluding the first and last ${EDGE_OFFSET_MIN} min.`)}
              </p>
            </div>
          </label>
          <label className="toggle-row toggle-row--switch" htmlFor="unlimitedWaterings">
            <input
              id="unlimitedWaterings"
              type="checkbox"
              className="toggle-switch"
              checked={params.unlimitedWaterings}
              onChange={(event) => handleUnlimitedToggle(event.target.checked)}
            />
            <span className="toggle-switch__slider" aria-hidden="true" />
            <div className="toggle-row__text">
              <div className="toggle-row__title">{l('Без ограничений', 'No cycle limit')}</div>
              <p className="toggle-row__desc">{l('До 100 поливов в сутки, специфичное применение', 'Up to 100 cycles per day for special setups')}</p>
            </div>
          </label>
          <label className="toggle-row toggle-row--switch" htmlFor="showCompensatedDripsCard">
            <input
              id="showCompensatedDripsCard"
              type="checkbox"
              className="toggle-switch"
              checked={params.showCompensatedDripsCard}
              onChange={(event) => updateParam('showCompensatedDripsCard', event.target.checked)}
            />
            <span className="toggle-switch__slider" aria-hidden="true" />
            <div className="toggle-row__text">
              <div className="toggle-row__title">{l('Компенсированные капельницы', 'Pressure-compensating drippers')}</div>
              <p className="toggle-row__desc">
                {l('Позволяет рассчитать расход при использовании таких капельниц', 'Calculates flow for pressure-compensating drippers')}
              </p>
            </div>
          </label>
          <label className="toggle-row toggle-row--switch" htmlFor="showTankCard">
            <input
              id="showTankCard"
              type="checkbox"
              className="toggle-switch"
              checked={params.showTankCard}
              onChange={(event) => updateParam('showTankCard', event.target.checked)}
            />
            <span className="toggle-switch__slider" aria-hidden="true" />
            <div className="toggle-row__text">
              <div className="toggle-row__title">{l('Рассчитать расход', 'Track tank supply')}</div>
              <p className="toggle-row__desc">{l('Позволяет рассчитать день следующего наполнения бака.', 'Estimates the next tank refill date.')}</p>
            </div>
          </label>
        </ControlCard>

        {params.showCompensatedDripsCard ? (
          <ControlCard
            className="control-card--drips"
            bentoSpan="desktop-full"
            title={l('Компенсированные капельницы', 'Pressure-compensating drippers')}
            description={l('Параметры системы', 'System parameters')}
          >
            <SliderInput
              showHeader={false}
              displayValue={l(`${params.dripRateLph.toFixed(1)} л/ч`, `${params.dripRateLph.toFixed(1)} L/h`)}
              value={params.dripRateLph}
              min={PARAM_LIMITS.dripRateLph.min}
              max={PARAM_LIMITS.dripRateLph.max}
              step={0.1}
              helper={l('Расход одной капельницы', 'Flow per dripper')}
              onChange={(value) => updateParam('dripRateLph', Number(value.toFixed(1)))}
            />
            <SliderInput
              showHeader={false}
              value={params.dripCount}
              min={PARAM_LIMITS.dripCount.min}
              max={PARAM_LIMITS.dripCount.max}
              step={1}
              suffix="x"
              helper={l('Количество капельниц на растение', 'Drippers per plant')}
              onChange={(value) => updateParam('dripCount', value)}
            />
            <SliderInput
              showHeader={false}
              value={params.plantCount}
              min={PARAM_LIMITS.plantCount.min}
              max={PARAM_LIMITS.plantCount.max}
              step={1}
              suffix="x"
              helper={l('Количество растений в системе', 'Plants in the system')}
              onChange={(value) => updateParam('plantCount', value)}
            />
          </ControlCard>
        ) : null}

        {params.showTankCard ? (
          <ControlCard
            className="control-card--tank"
            bentoSpan="desktop-full"
            title={l('Объём бака', 'Tank volume')}
            description={l('Расчёт до следующего наполнения', 'Estimate until the next refill')}
            bodyClassName="control-card--tank__body"
          >
            <SliderInput
              showHeader={false}
              value={params.dailyConsumptionLiters}
              min={PARAM_LIMITS.dailyConsumptionLiters.min}
              max={PARAM_LIMITS.dailyConsumptionLiters.max}
              step={0.1}
              suffix={l('л', 'L')}
              helper={l('Расход литров в день', 'Daily water use')}
              onChange={(value) => updateParam('dailyConsumptionLiters', value)}
              disabled={params.showCompensatedDripsCard}
            />
            <SliderInput
              showHeader={false}
              value={params.tankVolumeLiters}
              min={PARAM_LIMITS.tankVolumeLiters.min}
              max={PARAM_LIMITS.tankVolumeLiters.max}
              step={1}
              suffix={l('л', 'L')}
              helper={l('Объём воды', 'Water volume')}
              onChange={(value) => updateParam('tankVolumeLiters', value)}
            />
            <div className="tank-result" aria-live="polite">
              <strong className="tank-result__value">{daysUntilRefillRounded} {daysWord}</strong>
              <span className="tank-result__date">{l('Запас до', 'Supply until')} ≈ {nextRefillDateLabel}</span>
              <button
                className="reminder-button"
                onClick={handleCreateReminder}
                title={l('Создать напоминание', 'Create reminder')}
                aria-label={l('Создать напоминание о наполнении бака', 'Create a tank refill reminder')}
              >
                <span className="reminder-button__text">{l('Напомнить', 'Remind me')}</span>
              </button>
            </div>
          </ControlCard>
        ) : null}
      </ControlsGrid>

      <ScheduleTable
        entries={schedule.entries}
        volumes={volumes}
        params={params}
        windowStart={schedule.windowStart}
        windowEnd={schedule.windowEnd}
        dailyConsumptionLiters={params.dailyConsumptionLiters}
      />
    </>
  )
}

export default CalculatorPage
