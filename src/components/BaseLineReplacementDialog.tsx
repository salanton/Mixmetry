import type { FertilizerItem } from '../types'

export type BaseLineReplacement = {
  preset: FertilizerItem
  currentName: string
  currentCount: number
}

type BaseLineReplacementDialogProps = {
  replacement: BaseLineReplacement
  language: 'ru' | 'en'
  onCancel: () => void
  onConfirm: () => void
}

const BaseLineReplacementDialog = ({
  replacement,
  language,
  onCancel,
  onConfirm,
}: BaseLineReplacementDialogProps) => {
  const l = (ru: string, en: string) => language === 'ru' ? ru : en

  return (
    <div
      className="fertilizer-tools-overlay fertilizer-tools-overlay--stacked fertilizer-tools-overlay--warning"
      role="presentation"
      onClick={onCancel}
    >
      <section
        className="fertilizer-line-warning"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="base-line-warning-title"
        aria-describedby="base-line-warning-copy"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="fertilizer-tools__bar">
          <div>
            <p className="fertilizer-tools__eyebrow">{l('Предупреждение', 'Warning')}</p>
            <h2 id="base-line-warning-title">{l('Заменить базовую линейку?', 'Replace the base nutrient line?')}</h2>
          </div>
          <button className="fertilizer-tools__close" type="button" onClick={onCancel} aria-label={l('Закрыть', 'Close')}>
            ×
          </button>
        </div>
        <p id="base-line-warning-copy">
          {l(
            `Сейчас выбрана база ${replacement.currentName}. Если добавить ${replacement.preset.manufacturer} · ${replacement.preset.name}, текущая базовая линейка будет удалена${replacement.currentCount > 1 ? ` (${replacement.currentCount} поз.)` : ''}.`,
            `${replacement.currentName} is currently selected. Adding ${replacement.preset.manufacturer} · ${replacement.preset.name} will remove the current base line${replacement.currentCount > 1 ? ` (${replacement.currentCount} items)` : ''}.`,
          )}
        </p>
        <div className="fertilizer-line-warning__actions">
          <button className="fertilizer-line-warning__cancel" type="button" onClick={onCancel}>
            {l('Отмена', 'Cancel')}
          </button>
          <button className="fertilizer-line-warning__confirm" type="button" onClick={onConfirm}>
            {l('Заменить линейку', 'Replace line')}
          </button>
        </div>
      </section>
    </div>
  )
}

export default BaseLineReplacementDialog
