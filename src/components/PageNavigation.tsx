export type PageId = 'calculator' | 'recipe' | 'fertilizers'

type PageIconProps = {
  page: PageId
}

const PageIcon = ({ page }: PageIconProps) => {
  if (page === 'calculator') {
    return (
      <svg className="page-tabs__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2c-2.5 3.2-6.2 7.1-6.2 11a6.2 6.2 0 0 0 12.4 0c0-3.9-3.7-7.8-6.2-11Z" />
        <path d="M9.1 15.1a3.1 3.1 0 0 0 3.1 2.3" />
      </svg>
    )
  }

  if (page === 'fertilizers') {
    return (
      <svg className="page-tabs__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 4.2h9.6v3.1l1.8 2.4v8.1a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V9.7l1.8-2.4V4.2Z" />
        <path d="M7.2 7.3h9.6M8.8 13.5h6.4M12 10.3v6.4" />
      </svg>
    )
  }

  return (
    <svg className="page-tabs__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3.5h6M10 3.5v5.2l-4.2 8.1a2.5 2.5 0 0 0 2.2 3.7h8a2.5 2.5 0 0 0 2.2-3.7L14 8.7V3.5" />
      <path d="M8.2 15h7.6" />
    </svg>
  )
}

type PageNavigationProps = {
  activePage: PageId
  className?: string
  labels: {
    sections: string
    calculator: string
    fertilizers: string
    fertilizersShort: string
    recipe: string
    recipeShort: string
  }
  onSelect: (page: PageId) => void
}

const PageNavigation = ({ activePage, className = '', labels, onSelect }: PageNavigationProps) => (
  <nav className={`page-tabs ${className}`.trim()} aria-label={labels.sections}>
    <button
      className={`page-tabs__button page-tabs__button--calculator ${activePage === 'calculator' ? 'page-tabs__button--active' : ''}`}
      type="button"
      aria-label={labels.calculator}
      aria-current={activePage === 'calculator' ? 'page' : undefined}
      onClick={() => onSelect('calculator')}
    >
      <PageIcon page="calculator" />
      <span className="page-tabs__label page-tabs__label--desktop">{labels.calculator}</span>
      <span className="page-tabs__label page-tabs__label--mobile">{labels.calculator}</span>
    </button>
    <button
      className={`page-tabs__button page-tabs__button--fertilizers ${activePage === 'fertilizers' ? 'page-tabs__button--active' : ''}`}
      type="button"
      aria-label={labels.fertilizers}
      aria-current={activePage === 'fertilizers' ? 'page' : undefined}
      onClick={() => onSelect('fertilizers')}
    >
      <PageIcon page="fertilizers" />
      <span className="page-tabs__label page-tabs__label--desktop">{labels.fertilizers}</span>
      <span className="page-tabs__label page-tabs__label--mobile">{labels.fertilizersShort}</span>
    </button>
    <button
      className={`page-tabs__button page-tabs__button--recipe ${activePage === 'recipe' ? 'page-tabs__button--active' : ''}`}
      type="button"
      aria-label={labels.recipe}
      aria-current={activePage === 'recipe' ? 'page' : undefined}
      onClick={() => onSelect('recipe')}
    >
      <PageIcon page="recipe" />
      <span className="page-tabs__label page-tabs__label--desktop">{labels.recipe}</span>
      <span className="page-tabs__label page-tabs__label--mobile">{labels.recipeShort}</span>
    </button>
  </nav>
)

export default PageNavigation
