import type { ReactNode } from 'react'
import { FERTILIZER_CATEGORIES } from '../data/fertilizerLibrary'
import type { FertilizerCategoryId, FertilizerItem } from '../types'
import { getCategoryCopy } from '../utils/fertilizerLocalization'

type FertilizerShelfProps = {
  fertilizers: FertilizerItem[]
  language: 'ru' | 'en'
  formatBaseComponentCount: (fertilizer?: FertilizerItem) => string
  onOpenAddFlow: (categoryId: FertilizerCategoryId) => void
  renderFertilizerCard: (item: FertilizerItem, isBase: boolean) => ReactNode
}

const groupByManufacturer = (items: FertilizerItem[]) => {
  const groups = new Map<string, FertilizerItem[]>()
  items.forEach((item) => {
    const manufacturer = item.manufacturer || 'Без производителя'
    groups.set(manufacturer, [...(groups.get(manufacturer) ?? []), item])
  })
  return Array.from(groups, ([manufacturer, groupItems]) => ({ manufacturer, items: groupItems }))
}

const FertilizerShelf = ({
  fertilizers,
  language,
  formatBaseComponentCount,
  onOpenAddFlow,
  renderFertilizerCard,
}: FertilizerShelfProps) => {
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const baseFertilizers = fertilizers.filter((item) => item.categoryId === 'base')
  const additiveFertilizers = fertilizers.filter((item) => item.categoryId === 'boosters')
  const manufacturerCount = new Set(fertilizers.map((item) => item.manufacturer)).size

  return (
    <>
      <section className="fertilizer-overview" aria-label={l('Сводка по удобрениям', 'Nutrient overview')}>
        <div className="fertilizer-overview__tile fertilizer-overview__tile--base">
          <span>{l('База', 'Base')}</span>
          <strong>{formatBaseComponentCount(baseFertilizers[0])}</strong>
        </div>
        <div className="fertilizer-overview__tile">
          <span>{l('Добавки', 'Supplements')}</span>
          <strong>{additiveFertilizers.length}x</strong>
        </div>
        <div className="fertilizer-overview__tile">
          <span>{l('Производители', 'Manufacturers')}</span>
          <strong>{manufacturerCount}x</strong>
        </div>
      </section>

      <div className="fertilizer-shelf">
        {FERTILIZER_CATEGORIES.map((category) => {
          const categoryItems = fertilizers.filter((item) => item.categoryId === category.id)
          const categoryGroups = groupByManufacturer(categoryItems)
          const categoryCopy = getCategoryCopy(category.id, language) ?? category

          return (
            <section
              className={`fertilizer-category${category.id === 'base' ? ' fertilizer-category--base' : ''}`}
              key={category.id}
            >
              <header className="fertilizer-category__header">
                <div>
                  <h2 className="fertilizer-category__title">{categoryCopy.title}</h2>
                  <p className="fertilizer-category__description">{categoryCopy.description}</p>
                </div>
                <span
                  className="fertilizer-category__count"
                  aria-label={category.id === 'base'
                    ? l(`Схема компонентов: ${formatBaseComponentCount(categoryItems[0])}`, `Component scheme: ${formatBaseComponentCount(categoryItems[0])}`)
                    : l(`${categoryItems.length} позиций`, `${categoryItems.length} items`)}
                >
                  {category.id === 'base'
                    ? formatBaseComponentCount(categoryItems[0])
                    : `${categoryItems.length}x`}
                </span>
              </header>

              {categoryGroups.length > 0 ? (
                <div className="fertilizer-manufacturer-groups">
                  {categoryGroups.map((group) => (
                    <section className="fertilizer-manufacturer-group" key={group.manufacturer}>
                      {category.id !== 'base' ? (
                        <h3 className="fertilizer-manufacturer-group__title">{group.manufacturer}</h3>
                      ) : null}
                      <div className="fertilizer-card-grid">
                        {group.items.map((item) => renderFertilizerCard(item, category.id === 'base'))}
                      </div>
                    </section>
                  ))}
                  {category.id !== 'base' ? (
                    <button
                      className="fertilizer-card fertilizer-card--empty"
                      type="button"
                      onClick={() => onOpenAddFlow(category.id)}
                    >
                      <span className="fertilizer-card--empty__plus">+</span>
                      <span>{l('Добавить удобрение', 'Add nutrient')}</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="fertilizer-card-grid">
                  {categoryItems.map((item) => renderFertilizerCard(item, category.id === 'base'))}
                  <button
                    className="fertilizer-card fertilizer-card--empty"
                    type="button"
                    onClick={() => onOpenAddFlow(category.id)}
                  >
                    <span className="fertilizer-card--empty__plus">+</span>
                    <span>{category.id === 'base' ? l('Выбрать базу', 'Choose base') : l('Добавить удобрение', 'Add nutrient')}</span>
                  </button>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}

export default FertilizerShelf
