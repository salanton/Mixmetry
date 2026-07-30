import type { ChangeEvent } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'

type Props = {
  label?: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

const StepperInput = ({ label, value, min, max, step = 1, suffix, onChange }: Props) => {
  const { language } = useAppPreferences()
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)
    if (!Number.isNaN(next)) {
      onChange(Math.min(Math.max(next, min), max))
    }
  }

  const adjust = (delta: number) => {
    const next = Math.min(Math.max(value + delta, min), max)
    onChange(next)
  }

  return (
    <div className="stepper">
      {label ? <label className="input-label">{label}</label> : null}
      <div className="stepper__controls">
        <button
          type="button"
          aria-label={language === 'ru' ? 'Уменьшить' : 'Decrease'}
          className="stepper__btn"
          onClick={() => adjust(-step)}
          disabled={value <= min}
        >
          −
        </button>
        <div className="stepper__value">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleInput}
          />
          {suffix ? <span className="stepper__suffix">{suffix}</span> : null}
        </div>
        <button
          type="button"
          aria-label={language === 'ru' ? 'Увеличить' : 'Increase'}
          className="stepper__btn"
          onClick={() => adjust(step)}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default StepperInput
