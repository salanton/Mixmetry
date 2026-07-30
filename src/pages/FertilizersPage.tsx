import { useState } from 'react'
import { createPortal } from 'react-dom'
import BaseLineReplacementDialog, { type BaseLineReplacement } from '../components/BaseLineReplacementDialog'
import FertilizerDetailsActions from '../components/FertilizerDetailsActions'
import FertilizerDetailsModal from '../components/FertilizerDetailsModal'
import FertilizerLibraryDialog from '../components/FertilizerLibraryDialog'
import FertilizerShelf from '../components/FertilizerShelf'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { FERTILIZER_LIBRARY, PLANT_STAGES } from '../data/fertilizerLibrary'
import { usePersistentFertilizers } from '../hooks/usePersistentFertilizers'
import { useModalAccessibility } from '../hooks/useModalAccessibility'
import type { FertilizerCategoryId, FertilizerItem } from '../types'
import { formatBaseComponentCount, formatFertilizerBadge, formatRecipeDosage, formatStageDosage, localizeDosageText } from '../utils/fertilizerDosage'
import { getFertilizerCopy } from '../utils/fertilizerLocalization'

type PersistentFertilizers = ReturnType<typeof usePersistentFertilizers>

const FertilizersPage = function FertilizersPage({ fertilizerState }: { fertilizerState: PersistentFertilizers }) {
  const { language } = useAppPreferences()
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const [selectedFertilizerId, setSelectedFertilizerId] = useState<string | null>(null)
  const [selectedLibraryPresetId, setSelectedLibraryPresetId] = useState<string | null>(null)
  const [addFlowCategoryId, setAddFlowCategoryId] = useState<FertilizerCategoryId | null>(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null)
  const [baseLineReplacement, setBaseLineReplacement] = useState<BaseLineReplacement | null>(null)
  const [isBaseDeleteConfirmOpen, setIsBaseDeleteConfirmOpen] = useState(false)
  const {
    fertilizers,
    fertilizerIds,
    addFromLibrary,
    deleteFertilizer,
  } = fertilizerState

  const selectedFertilizer = fertilizers.find((item) => item.id === selectedFertilizerId)
  const selectedLibraryPreset = FERTILIZER_LIBRARY.find((item) => item.id === selectedLibraryPresetId)
  const baseFertilizers = fertilizers.filter((item) => item.categoryId === 'base')
  const currentBaseName = baseFertilizers[0]
    ? `${baseFertilizers[0].manufacturer} · ${baseFertilizers[0].name}`
    : null

  const openAddFlow = (categoryId: FertilizerCategoryId) => {
    setAddFlowCategoryId(categoryId)
    setSelectedManufacturer(null)
    setSelectedLibraryPresetId(null)
    setBaseLineReplacement(null)
  }

  const closeAddFlow = () => {
    setAddFlowCategoryId(null)
    setSelectedManufacturer(null)
    setSelectedLibraryPresetId(null)
    setBaseLineReplacement(null)
  }

  const handleLibraryAdd = (preset: (typeof FERTILIZER_LIBRARY)[number]) => {
    if (
      preset.categoryId === 'base'
      && currentBaseName
      && !fertilizerIds.has(preset.id)
    ) {
      setBaseLineReplacement({
        preset,
        currentName: currentBaseName,
        currentCount: baseFertilizers.length,
      })
      return
    }

    addFromLibrary(preset)
    closeAddFlow()
  }

  const handleLibraryQuickToggle = (preset: (typeof FERTILIZER_LIBRARY)[number]) => {
    if (preset.categoryId !== 'boosters') {
      handleLibraryAdd(preset)
      return
    }

    if (fertilizerIds.has(preset.id)) {
      deleteFertilizer(preset.id)
    } else {
      addFromLibrary(preset)
    }
  }

  const confirmBaseLineReplacement = () => {
    if (!baseLineReplacement) return

    addFromLibrary(baseLineReplacement.preset, { replaceBaseLine: true })
    closeAddFlow()
  }

  const handleDelete = (id: string) => {
    deleteFertilizer(id)
    setIsBaseDeleteConfirmOpen(false)
    if (selectedFertilizerId === id) {
      setSelectedFertilizerId(null)
    }
  }

  const closeFertilizerDetails = () => {
    setSelectedFertilizerId(null)
    setIsBaseDeleteConfirmOpen(false)
  }

  const closeLibraryDetails = () => {
    setSelectedLibraryPresetId(null)
  }

  const closeActiveFertilizerModal = () => {
    if (baseLineReplacement) {
      setBaseLineReplacement(null)
    } else if (selectedLibraryPresetId) {
      closeLibraryDetails()
    } else if (selectedFertilizerId) {
      closeFertilizerDetails()
    } else if (addFlowCategoryId) {
      closeAddFlow()
    }
  }

  useModalAccessibility(
    baseLineReplacement
      ? 'base-warning'
      : selectedLibraryPresetId
      ? `library-${selectedLibraryPresetId}`
      : selectedFertilizerId
      ? `fertilizer-${selectedFertilizerId}`
      : addFlowCategoryId
      ? `add-${addFlowCategoryId}`
      : null,
    '.fertilizers-page [role="dialog"], .fertilizers-page [role="alertdialog"]',
    closeActiveFertilizerModal,
  )

  const getDosageLabel = (
    item: FertilizerItem,
    stageId: (typeof PLANT_STAGES)[number]['id'],
  ) => localizeDosageText(formatStageDosage(item, stageId), language)

  const renderDosageLabel = (item: FertilizerItem, stageId: (typeof PLANT_STAGES)[number]['id']) => {
    if (!item.components?.length) return <strong>{getDosageLabel(item, stageId)}</strong>

    return (
      <div className="fertilizer-dosage-table__components">
        {item.components.map((component) => (
          <span className="fertilizer-dosage-table__component" key={component.id}>
            <small>{component.name}</small>
            <strong>{localizeDosageText(formatRecipeDosage(item, stageId, item.growMethodId, component), language)}</strong>
          </span>
        ))}
      </div>
    )
  }

  const getSourceLabel = () => l('Из базы', 'From library')
  const renderFertilizerCard = (item: FertilizerItem, showBaseActions = false) => {
    const badge = formatFertilizerBadge(item.name)
    const copy = getFertilizerCopy(item, language)

    return (
      <article
        className={`fertilizer-card${showBaseActions ? ' fertilizer-card--base' : ''}`}
        key={item.id}
      >
        <div className="fertilizer-card__media" aria-hidden="true">
          <span className={badge.length > 4 ? 'fertilizer-card__badge-text--dense' : undefined}>
            {badge}
          </span>
        </div>
        <div className="fertilizer-card__body">
          <div className="fertilizer-card__topline">
            <button
              className="fertilizer-card__main"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSelectedFertilizerId(item.id)}
            >
              <span className="fertilizer-card__name">
                {showBaseActions ? (
                  <span className="fertilizer-card__manufacturer">{item.manufacturer}</span>
                ) : null}
                <h3 className="fertilizer-card__title">{item.name}</h3>
                {showBaseActions ? (
                  <span className="fertilizer-card__base-description">{copy.shortDescription}</span>
                ) : null}
              </span>
            </button>
          </div>
          {!showBaseActions ? <p className="fertilizer-card__meta">{copy.shortDescription}</p> : null}
        </div>
        {showBaseActions ? (
          <span className="fertilizer-card__chevron" aria-hidden="true">›</span>
        ) : null}
      </article>
    )
  }

  return (
    <section
      className="fertilizers-page"
      aria-label={l('Удобрения', 'Nutrients')}
    >
      {addFlowCategoryId ? createPortal(
        <FertilizerLibraryDialog
          categoryId={addFlowCategoryId}
          language={language}
          selectedManufacturer={selectedManufacturer}
          fertilizerIds={fertilizerIds}
          onClose={closeAddFlow}
          onSelectManufacturer={setSelectedManufacturer}
          onPreview={setSelectedLibraryPresetId}
          onQuickToggle={handleLibraryQuickToggle}
        />,
        document.body,
      ) : null}

      {baseLineReplacement ? createPortal(
        <BaseLineReplacementDialog
          replacement={baseLineReplacement}
          language={language}
          onCancel={() => setBaseLineReplacement(null)}
          onConfirm={confirmBaseLineReplacement}
        />,
        document.body,
      ) : null}

      {selectedLibraryPreset ? createPortal(
        <>
        <FertilizerDetailsModal
          fertilizer={selectedLibraryPreset}
          language={language}
          mode="library"
          onClose={closeLibraryDetails}
          renderDosageLabel={renderDosageLabel}
        />
        <FertilizerDetailsActions
          fertilizer={selectedLibraryPreset}
          language={language}
          mode="library"
          isAdded={fertilizerIds.has(selectedLibraryPreset.id)}
          onAdd={() => handleLibraryAdd(selectedLibraryPreset)}
        />
        </>,
        document.body,
      ) : null}

      {selectedFertilizer ? createPortal(
        <>
        <FertilizerDetailsModal
          fertilizer={selectedFertilizer}
          language={language}
          mode="selected"
          sourceLabel={getSourceLabel()}
          onClose={closeFertilizerDetails}
          renderDosageLabel={renderDosageLabel}
        />
        <FertilizerDetailsActions
          fertilizer={selectedFertilizer}
          language={language}
          mode="selected"
          isDeleteConfirmOpen={isBaseDeleteConfirmOpen}
          onChangeBase={() => {
            closeFertilizerDetails()
            openAddFlow('base')
          }}
          onRequestDelete={() => setIsBaseDeleteConfirmOpen(true)}
          onCancelDelete={() => setIsBaseDeleteConfirmOpen(false)}
          onDelete={() => handleDelete(selectedFertilizer.id)}
        />
        </>,
        document.body,
      ) : null}

      <FertilizerShelf
        fertilizers={fertilizers}
        language={language}
        formatBaseComponentCount={formatBaseComponentCount}
        onOpenAddFlow={openAddFlow}
        renderFertilizerCard={renderFertilizerCard}
      />
    </section>
  )
}


export default FertilizersPage
