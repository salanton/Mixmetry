import { createPortal } from 'react-dom'
import AppShell from './components/AppShell'
import AppSettings from './components/AppSettings'
import PageNavigation from './components/PageNavigation'
import { usePersistentFertilizers } from './hooks/usePersistentFertilizers'
import { usePersistentParams } from './hooks/usePersistentParams'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import CalculatorPage from './pages/CalculatorPage'
import FertilizersPage from './pages/FertilizersPage'
import RecipePage from './pages/RecipePage'
import mixmetryMark from './assets/mixmetry-mark.svg'
import { useAppPreferences } from './contexts/AppPreferencesContext'
import './styles/app.css'

function App() {
  const persistentParams = usePersistentParams()
  const persistentFertilizers = usePersistentFertilizers()
  const { t } = useAppPreferences()
  const {
    activePage,
    isHeaderOverContent,
    swipeViewportHeight,
    swipeViewportRef,
    swipeTrackRef,
    setPanelRef,
    selectPage,
    handlePanelScroll,
    scrollActivePageToTop,
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    handleSwipeCancel,
  } = useSwipeNavigation()

  return (
    <>
    <AppShell
      className={`app-shell--${activePage}`}
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
      onTouchCancel={handleSwipeCancel}
    >
      <header className={`topbar${isHeaderOverContent ? ' topbar--over-content' : ''}`}>
        <div className="topbar__heading">
          <button
            className="topbar__brand"
            type="button"
            disabled={!isHeaderOverContent}
            aria-label={isHeaderOverContent ? t('actions.backToTop') : undefined}
            onClick={scrollActivePageToTop}
          >
            <span className="topbar__identity">
              <img className="topbar__mark" src={mixmetryMark} alt="" />
              <span className="topbar__title">Mixmetry</span>
            </span>
            <span className="topbar__brand-return" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m6 14 6-6 6 6" />
              </svg>
            </span>
          </button>
        </div>
        <div className="topbar__actions">
        <PageNavigation
          activePage={activePage}
          className="page-tabs--desktop"
          labels={{
            sections: t('nav.sections'),
            calculator: t('nav.calculator'),
            fertilizers: t('nav.fertilizers'),
            fertilizersShort: t('nav.fertilizersShort'),
            recipe: t('nav.recipe'),
            recipeShort: t('nav.recipeShort'),
          }}
          onSelect={selectPage}
        />
        <AppSettings />
        </div>
      </header>

      <main
        ref={swipeViewportRef}
        className="swipe-viewport"
        style={swipeViewportHeight ? { height: `${swipeViewportHeight}px` } : undefined}
      >
        <div ref={swipeTrackRef} className="swipe-track">
          <div
            ref={(node) => setPanelRef('calculator', node)}
            className="page swipe-panel"
            aria-hidden={activePage !== 'calculator'}
            inert={activePage !== 'calculator'}
            onScroll={(event) => handlePanelScroll('calculator', event)}
          >
            <CalculatorPage {...persistentParams} />
          </div>
          <div
            ref={(node) => setPanelRef('fertilizers', node)}
            className="page swipe-panel"
            aria-hidden={activePage !== 'fertilizers'}
            inert={activePage !== 'fertilizers'}
            onScroll={(event) => handlePanelScroll('fertilizers', event)}
          >
            <FertilizersPage fertilizerState={persistentFertilizers} />
          </div>
          <div
            ref={(node) => setPanelRef('recipe', node)}
            className="page swipe-panel"
            aria-hidden={activePage !== 'recipe'}
            inert={activePage !== 'recipe'}
            onScroll={(event) => handlePanelScroll('recipe', event)}
          >
            <RecipePage {...persistentParams} fertilizers={persistentFertilizers.fertilizers} />
          </div>
        </div>
      </main>
    </AppShell>
    {createPortal(
      <div className={`mobile-nav-dock app-shell--${activePage}`}>
        <PageNavigation
          activePage={activePage}
          className="page-tabs--mobile"
          labels={{
            sections: t('nav.sections'),
            calculator: t('nav.calculator'),
            fertilizers: t('nav.fertilizers'),
            fertilizersShort: t('nav.fertilizersShort'),
            recipe: t('nav.recipe'),
            recipeShort: t('nav.recipeShort'),
          }}
          onSelect={selectPage}
        />
      </div>,
      document.body,
    )}
    </>
  )
}

export default App
