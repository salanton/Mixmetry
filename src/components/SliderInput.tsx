type Props = {
  label?: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  helper?: string
  showHeader?: boolean
  displayValue?: string
  disabled?: boolean
  onChange: (value: number) => void
}

const SliderInput = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  helper,
  showHeader = true,
  displayValue,
  disabled = false,
  onChange,
}: Props) => (
  <div className={`slider${disabled ? ' slider--disabled' : ''}`}>
    {showHeader ? (
      <div className="slider__row">
        {label ? <label className="input-label">{label}</label> : <span aria-hidden="true" />}
        <div className="slider__value">
          {value.toFixed(step < 1 ? 1 : 0)}
          {suffix ? ` ${suffix}` : ''}
        </div>
      </div>
    ) : (
      <div className="slider__value slider__value--standalone">
        {displayValue ?? value.toFixed(step < 1 ? 1 : 0)}
        {suffix && !displayValue ? ` ${suffix}` : ''}
      </div>
    )}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
    />
    {helper ? <p className="input-helper slider__helper">{helper}</p> : null}
  </div>
)

export default SliderInput
