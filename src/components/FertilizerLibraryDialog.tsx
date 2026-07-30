import { FERTILIZER_LIBRARY } from '../data/fertilizerLibrary'
import type { FertilizerCategoryId, FertilizerItem } from '../types'
import { getCategoryCopy, getFertilizerCopy } from '../utils/fertilizerLocalization'

type FertilizerLibraryDialogProps = {
  categoryId: FertilizerCategoryId
  language: 'ru' | 'en'
  selectedManufacturer: string | null
  fertilizerIds: Set<string>
  onClose: () => void
  onSelectManufacturer: (manufacturer: string | null) => void
  onPreview: (fertilizerId: string) => void
  onQuickToggle: (fertilizer: FertilizerItem) => void
}

const FertilizerLibraryDialog = ({
  categoryId,
  language,
  selectedManufacturer,
  fertilizerIds,
  onClose,
  onSelectManufacturer,
  onPreview,
  onQuickToggle,
}: FertilizerLibraryDialogProps) => {
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const categoryItems = FERTILIZER_LIBRARY.filter((item) => item.categoryId === categoryId)
  const manufacturerOptions = Array.from(new Set(categoryItems.map((item) => item.manufacturer))).sort((a, b) =>
    a.localeCompare(b, 'ru'),
  )
  const selectedManufacturerItems = selectedManufacturer
    ? categoryItems.filter((item) => item.manufacturer === selectedManufacturer)
    : []

  return (
    <div className="fertilizer-tools-overlay" role="presentation" onClick={onClose}>
      <section
        className="fertilizer-tools"
        role="dialog"
        aria-modal="true"
        aria-label={l('Добавление удобрений', 'Add nutrients')}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="fertilizer-tools__bar">
          <div>
            <p className="fertilizer-tools__eyebrow">{l('Добавление', 'Add')}</p>
            <h2>{getCategoryCopy(categoryId, language)?.title ?? l('Удобрение', 'Nutrient')}</h2>
          </div>
          <button className="fertilizer-tools__close" type="button" onClick={onClose} aria-label={l('Закрыть', 'Close')}>
            ×
          </button>
        </div>

        <section className="fertilizer-library" aria-labelledby="fertilizer-library-title">
          <div className="fertilizer-form__header">
            <h2 id="fertilizer-library-title">
              {selectedManufacturer ?? l('Список производителей', 'Manufacturers')}
            </h2>
            <p>
              {selectedManufacturer
                ? l('Выберите удобрение этого производителя.', 'Choose a nutrient from this manufacturer.')
                : l('Сначала выберите производителя, потом конкретное удобрение.', 'Choose a manufacturer, then select a nutrient.')}
            </p>
          </div>
          {!selectedManufacturer ? (
            <div className="fertilizer-library__list">
              {manufacturerOptions.length > 0 ? manufacturerOptions.map((manufacturer) => {
                const count = categoryItems.filter((item) => item.manufacturer === manufacturer).length
                return (
                  <button
                    className="fertilizer-library__item"
                    key={manufacturer}
                    type="button"
                    onClick={() => onSelectManufacturer(manufacturer)}
                  >
                    <span>
                      <strong>{manufacturer}</strong>
                      <small>{count} {l('поз.', 'items')}</small>
                    </span>
                    <span className="fertilizer-library__plus">→</span>
                  </button>
                )
              }) : (
                <p className="fertilizer-library__empty">{l('Для этой категории все шаблоны уже добавлены.', 'All available items in this category have already been added.')}</p>
              )}
            </div>
          ) : (
            <div className="fertilizer-library__list">
              {selectedManufacturerItems.length > 0 ? selectedManufacturerItems.map((preset) => {
                const isAdded = fertilizerIds.has(preset.id)
                return (
                  <article
                    className={`fertilizer-library__card ${isAdded ? 'fertilizer-library__card--added' : ''}`}
                    key={preset.id}
                  >
                    <button
                      className="fertilizer-library__preview"
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => onPreview(preset.id)}
                    >
                      <span>
                        <strong>{preset.name}</strong>
                        <small>{preset.manufacturer} · {getFertilizerCopy(preset, language).shortDescription}</small>
                      </span>
                    </button>
                    <button
                      className={`fertilizer-library__plus ${isAdded ? 'fertilizer-library__plus--added' : ''}`}
                      type="button"
                      aria-label={isAdded
                        ? preset.categoryId === 'boosters'
                          ? l(`Убрать ${preset.name}`, `Remove ${preset.name}`)
                          : l(`${preset.name} уже добавлено`, `${preset.name} already added`)
                        : l(`Добавить ${preset.name}`, `Add ${preset.name}`)}
                      aria-pressed={isAdded}
                      disabled={isAdded && preset.categoryId === 'base'}
                      onClick={(event) => {
                        event.stopPropagation()
                        onQuickToggle(preset)
                      }}
                    >
                      {isAdded ? '✓' : '+'}
                    </button>
                  </article>
                )
              }) : (
                <p className="fertilizer-library__empty">{l('У этого производителя все шаблоны уже добавлены.', 'All available items from this manufacturer have already been added.')}</p>
              )}
            </div>
          )}
          <button
            className="fertilizer-flow-actions__secondary"
            type="button"
            onClick={() => selectedManufacturer ? onSelectManufacturer(null) : onClose()}
          >
            {l('Назад', 'Back')}
          </button>
        </section>
      </section>
    </div>
  )
}

export default FertilizerLibraryDialog
