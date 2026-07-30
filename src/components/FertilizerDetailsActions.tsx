import type { FertilizerItem } from '../types'

type CommonProps = {
  fertilizer: FertilizerItem
  language: 'ru' | 'en'
}

type LibraryActionsProps = CommonProps & {
  mode: 'library'
  isAdded: boolean
  onAdd: () => void
}

type SelectedActionsProps = CommonProps & {
  mode: 'selected'
  isDeleteConfirmOpen: boolean
  onChangeBase: () => void
  onRequestDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

type FertilizerDetailsActionsProps = LibraryActionsProps | SelectedActionsProps

const FertilizerDetailsActions = (props: FertilizerDetailsActionsProps) => {
  const l = (ru: string, en: string) => props.language === 'ru' ? ru : en

  if (props.mode === 'library') {
    return (
      <div className="fertilizer-details-actions fertilizer-details-actions--single">
        <button
          className={`fertilizer-details-actions__change ${props.isAdded ? 'fertilizer-details-actions__change--added' : ''}`}
          type="button"
          aria-pressed={props.isAdded}
          disabled={props.isAdded}
          onClick={props.onAdd}
        >
          {props.isAdded ? l('✓ Добавлено', '✓ Added') : l('Добавить', 'Add')}
        </button>
      </div>
    )
  }

  const isBase = props.fertilizer.categoryId === 'base'
  return (
    <div className={`fertilizer-details-actions${!isBase ? ' fertilizer-details-actions--single' : ''}`}>
      {isBase ? (
        <button className="fertilizer-details-actions__change" type="button" onClick={props.onChangeBase}>
          {l('Сменить базу', 'Change base')}
        </button>
      ) : null}
      {!props.isDeleteConfirmOpen ? (
        <button className="fertilizer-details-actions__more" type="button" onClick={props.onRequestDelete}>
          {isBase ? l('Удалить', 'Delete') : l('Удалить добавку', 'Delete supplement')}
        </button>
      ) : (
        <div className="fertilizer-details-actions__confirm" role="alert">
          <span>
            {isBase
              ? l('Удалить базу из набора?', 'Remove the base nutrient from the collection?')
              : l('Удалить добавку из набора?', 'Remove the supplement from the collection?')}
          </span>
          <button type="button" onClick={props.onCancelDelete}>{l('Отмена', 'Cancel')}</button>
          <button className="fertilizer-details-actions__delete" type="button" onClick={props.onDelete}>
            {l('Удалить', 'Delete')}
          </button>
        </div>
      )}
    </div>
  )
}

export default FertilizerDetailsActions
