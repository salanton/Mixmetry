import type { ReactNode } from 'react'
import { PLANT_STAGES } from '../data/fertilizerLibrary'
import type { FertilizerItem, PlantStageId } from '../types'
import { getFertilizerCopy, getStageDisplay } from '../utils/fertilizerLocalization'

type FertilizerDetailsModalProps = {
  fertilizer: FertilizerItem
  language: 'ru' | 'en'
  mode: 'library' | 'selected'
  sourceLabel?: string
  onClose: () => void
  renderDosageLabel: (fertilizer: FertilizerItem, stageId: PlantStageId) => ReactNode
}

const FertilizerDetailsModal = ({
  fertilizer,
  language,
  mode,
  sourceLabel,
  onClose,
  renderDosageLabel,
}: FertilizerDetailsModalProps) => {
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const copy = getFertilizerCopy(fertilizer, language)
  const isLibraryItem = mode === 'library'

  return (
    <div
      className={`fertilizer-tools-overlay fertilizer-tools-overlay--details${isLibraryItem ? ' fertilizer-tools-overlay--stacked' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <section
        className="fertilizer-details-modal"
        role="dialog"
        aria-modal="true"
        aria-label={isLibraryItem
          ? l(`Описание удобрения ${fertilizer.name}`, `${fertilizer.name} nutrient details`)
          : l(`Карточка удобрения ${fertilizer.name}`, `${fertilizer.name} nutrient card`)}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="fertilizer-tools__bar">
          <div>
            <p className="fertilizer-tools__eyebrow">
              {isLibraryItem ? l('Из базы', 'From library') : l('Удобрение', 'Nutrient')}
            </p>
            <h2>{fertilizer.name}</h2>
            <p className="fertilizer-details-modal__meta">
              {fertilizer.manufacturer}{sourceLabel ? ` · ${sourceLabel}` : ''}
            </p>
          </div>
          <button
            className="fertilizer-tools__close"
            type="button"
            onClick={onClose}
            aria-label={l('Закрыть', 'Close')}
          >
            ×
          </button>
        </div>

        <div className="fertilizer-card__details">
          <p>{copy.description}</p>
          <div className="fertilizer-card__chips" aria-label={l('Поля описания', 'Product details')}>
            {copy.details.map((detail) => (
              <span className="fertilizer-card__chip" key={detail}>{detail}</span>
            ))}
          </div>
          <div className="fertilizer-dosage-table" aria-label={l('Дозировки по этапам', 'Dosage by growth stage')}>
            <div className="fertilizer-dosage-table__row fertilizer-dosage-table__row--head">
              <span>{l('Этап', 'Stage')}</span>
              <strong>{l('Дозировка', 'Dosage')}</strong>
            </div>
            {PLANT_STAGES.map((stage) => {
              const display = getStageDisplay(stage, fertilizer, language)
              return (
                <div className="fertilizer-dosage-table__row" key={stage.id}>
                  <span className="fertilizer-dosage-table__stage">
                    <span>{display.title}</span>
                    {display.manufacturerTitle ? <small>{display.manufacturerTitle}</small> : null}
                  </span>
                  {renderDosageLabel(fertilizer, stage.id)}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default FertilizerDetailsModal
