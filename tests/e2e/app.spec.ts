import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('switches between all application sections', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Полив' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Световой режим растений' })).toBeVisible()

  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expect(page.getByRole('button', { name: 'Мои удобрения' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'База' })).toBeVisible()

  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await expect(page.getByRole('button', { name: 'Мой рецепт' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Результаты расчета' })).toBeVisible()
})

test('opens the fertilizer library directly without a manual flow', async ({ page }) => {
  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await page.getByRole('button', { name: '+ Добавить удобрение' }).click()

  const dialog = page.getByRole('dialog', { name: 'Добавление удобрений' })
  await expect(dialog.getByRole('heading', { name: 'Список производителей' })).toBeVisible()
  await expect(dialog.getByText('Добавить вручную')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /Simplex/ })).toBeVisible()
})

test('adds, marks, persists and removes an additive', async ({ page }) => {
  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await page.getByRole('button', { name: '+ Добавить удобрение' }).click()
  let dialog = page.getByRole('dialog', { name: 'Добавление удобрений' })
  await dialog.getByRole('button', { name: /Simplex/ }).click()
  await dialog.getByRole('button', { name: 'Добавить КалМаг Плюс' }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Убрать КалМаг Плюс' })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Убрать КалМаг Плюс' }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Добавить КалМаг Плюс' })).toHaveAttribute('aria-pressed', 'false')
  await dialog.getByRole('button', { name: 'Добавить КалМаг Плюс' }).click()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()

  await expect(page.getByRole('heading', { name: 'КалМаг Плюс' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expect(page.getByRole('heading', { name: 'КалМаг Плюс' })).toBeVisible()

  await page.getByRole('button', { name: '+ Добавить удобрение' }).click()
  dialog = page.getByRole('dialog', { name: 'Добавление удобрений' })
  await dialog.getByRole('button', { name: /Simplex/ }).click()
  await expect(dialog.getByRole('button', { name: 'Убрать КалМаг Плюс' })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Закрыть' }).click()

  await page.getByRole('button', { name: 'КалМаг Плюс' }).click()
  await expect(page.getByRole('dialog', { name: 'Карточка удобрения КалМаг Плюс' })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить добавку' }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'КалМаг Плюс' })).toHaveCount(0)
})

test('selects and replaces a base line and updates the recipe', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await page.getByRole('button', { name: '+ Выбрать базу' }).click()
  let dialog = page.getByRole('dialog', { name: 'Добавление удобрений' })
  await dialog.getByRole('button', { name: /Simplex/ }).click()
  await dialog.getByRole('button', { name: 'Добавить Кокос A+B' }).click()
  await expect(page.getByRole('heading', { name: 'Кокос A+B' })).toBeVisible()

  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await page.locator('.recipe-card--method .recipe-choice-button').click()
  const picker = page.getByRole('dialog', { name: 'Выбор: Метод выращивания' })
  await expect(picker.getByRole('button', { name: /Гидропоника/ }).getByLabel('Выбрано')).toBeVisible()
  await expect(picker.getByRole('button', { name: /Кокос/ }).getByLabel('Соответствует выбранной базе')).toBeVisible()
  await picker.getByRole('button', { name: 'Закрыть' }).click()
  await page.getByRole('button', { name: 'Мои удобрения' }).click()

  await page.getByRole('button', { name: 'Кокос A+B' }).click()
  const baseDetails = page.getByRole('dialog', { name: 'Карточка удобрения Кокос A+B' })
  if (testInfo.project.name.startsWith('mobile')) {
    const geometry = await page.evaluate(() => {
      const modal = document.querySelector('.fertilizer-details-modal')
      const actions = document.querySelector('.fertilizer-details-actions')
      const actionButton = actions?.querySelector('button')
      const content = modal?.querySelector<HTMLElement>('.fertilizer-card__details')
      return {
        actionGap: modal && actions
          ? Math.abs(modal.getBoundingClientRect().bottom - actions.getBoundingClientRect().bottom)
          : Number.POSITIVE_INFINITY,
        actionButtonBottomGap: actions && actionButton
          ? actions.getBoundingClientRect().bottom - actionButton.getBoundingClientRect().bottom
          : Number.POSITIVE_INFINITY,
        actionButtonTopGap: actions && actionButton
          ? actionButton.getBoundingClientRect().top - actions.getBoundingClientRect().top
          : Number.POSITIVE_INFINITY,
        contentClientHeight: content?.clientHeight ?? 0,
        contentScrollHeight: content?.scrollHeight ?? 0,
        contentOverflowY: content ? getComputedStyle(content).overflowY : '',
        contentScrollbarWidth: content ? getComputedStyle(content).scrollbarWidth : '',
        contentBottomGap: modal && content
          ? Math.abs(modal.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom)
          : Number.POSITIVE_INFINITY,
        modalBorderRightWidth: modal ? getComputedStyle(modal).borderRightWidth : '',
        modalBorderBottomWidth: modal ? getComputedStyle(modal).borderBottomWidth : '',
      }
    })
    expect(geometry.actionGap).toBeLessThanOrEqual(9)
    expect(geometry.actionButtonBottomGap).toBeLessThan(8)
    expect(Math.abs(geometry.actionButtonTopGap - geometry.actionButtonBottomGap)).toBeLessThanOrEqual(1)
    expect(geometry.contentOverflowY).toBe('auto')
    expect(geometry.contentScrollbarWidth).toBe('none')
    expect(geometry.contentBottomGap).toBeLessThanOrEqual(1)
    expect(geometry.modalBorderRightWidth).toBe('0px')
    expect(geometry.modalBorderBottomWidth).toBe('0px')
    expect(geometry.contentScrollHeight).toBeGreaterThan(geometry.contentClientHeight)
    const detailsContent = baseDetails.locator('.fertilizer-card__details')
    await detailsContent.evaluate((content) => { content.scrollTop = content.scrollHeight })
    await expect.poll(() => detailsContent.evaluate((content) => content.scrollTop)).toBeGreaterThan(0)
    const bottomClearance = await page.evaluate(() => {
      const modal = document.querySelector('.fertilizer-details-modal')
      const content = modal?.querySelector('.fertilizer-card__details')
      const actions = document.querySelector('.fertilizer-details-actions')
      const rows = content?.querySelectorAll('.fertilizer-dosage-table__row')
      const lastRow = rows?.item((rows?.length ?? 1) - 1)
      if (!content || !actions || !lastRow) return Number.NEGATIVE_INFINITY
      return Math.min(content.getBoundingClientRect().bottom, actions.getBoundingClientRect().top)
        - lastRow.getBoundingClientRect().bottom
    })
    expect(bottomClearance).toBeGreaterThanOrEqual(16)
  }
  await page.getByRole('button', { name: 'Сменить базу' }).click()
  dialog = page.getByRole('dialog', { name: 'Добавление удобрений' })
  await dialog.getByRole('button', { name: /Simplex/ }).click()
  await dialog.getByRole('button', { name: 'Добавить ГидроВега A+B' }).click()
  const warning = page.getByRole('alertdialog', { name: 'Заменить базовую линейку?' })
  await warning.getByRole('button', { name: 'Заменить линейку' }).click()
  await expect(page.getByRole('heading', { name: 'ГидроВега A+B' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Кокос A+B' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  const recipePage = page.locator('.recipe-page')
  await expect(recipePage.getByText('ГидроВега A+B', { exact: true }).first()).toBeVisible()
  await expect(recipePage.getByText('Нет базового удобрения для выбранных параметров.')).toHaveCount(0)
  const baseTable = recipePage.locator('.recipe-table').first()
  const perLiterHeader = baseTable.locator('.recipe-table__head span').nth(1)
  const perLiterValue = baseTable.locator('.recipe-table__row span').first()
  const totalValue = baseTable.locator('.recipe-table__row span').nth(1)
  await expect(perLiterHeader).toHaveCSS('text-align', 'center')
  await expect(perLiterHeader).toHaveText('мл/л')
  await expect(perLiterValue).toHaveCSS('text-align', 'center')
  await expect(perLiterValue).not.toContainText('мл')
  await expect(perLiterValue).not.toContainText('/л')
  await expect(totalValue).not.toContainText('мл')
  const volume = page.getByRole('slider', { name: 'Общий объём воды для рецепта' })
  await volume.fill('30')
  await expect(page.getByText('На 30л', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/Расчёт носит справочный характер/)).toBeVisible()
})

test('keeps recipe pickers attached to the viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await page.locator('.recipe-card--method .recipe-choice-button').click()

  const picker = page.getByRole('dialog', { name: 'Выбор: Метод выращивания' })
  await expect(picker).toBeVisible()
  const geometry = await picker.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      isPortaled: element.parentElement?.parentElement === document.body,
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
    }
  })
  expect(geometry.isPortaled).toBe(true)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight)

  await picker.getByRole('button', { name: /Кокос/ }).click()
  await expect(picker).toHaveCount(0)
  await expect(page.locator('.recipe-card--method .recipe-choice-button__value')).toHaveText('Кокос')
})

test('persists calculator settings after reload', async ({ page }) => {
  const waterings = page.getByRole('slider', { name: 'Количество включений' })
  await waterings.fill('2')
  await expect(waterings).toHaveValue('2')

  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByRole('slider', { name: 'Количество включений' })).toHaveValue('2')
})

test('recovers from corrupted saved settings', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('mixmetry:params:v2', '{broken json'))
  await page.reload()

  await expect(page.getByRole('button', { name: 'Полив' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('slider', { name: 'Количество включений' })).toHaveValue('4')
})

test('remains usable when persistent storage rejects writes', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError')
    }
  })
  await page.reload()

  const waterings = page.getByRole('slider', { name: 'Количество включений' })
  await waterings.fill('3')
  await expect(waterings).toHaveValue('3')
  await expect(page.getByRole('heading', { name: 'Расписание поливов' })).toBeVisible()
})

test('downloads a standards-based calendar reminder', async ({ page }) => {
  const calculateTank = page.getByRole('checkbox', { name: /Рассчитать расход/ })
  await page.getByText('Рассчитать расход', { exact: true }).click()
  await expect(calculateTank).toBeChecked()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Создать напоминание о наполнении бака' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^напоминание-\d{4}-\d{2}-\d{2}\.ics$/)
})

test('reloads the installed application shell while offline', async ({ page, context }) => {
  await page.reload()
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false
    await navigator.serviceWorker.ready
    return Boolean(navigator.serviceWorker.controller)
  })

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Полив' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Световой режим растений' })).toBeVisible()
  await context.setOffline(false)
})

test('applies and persists language and theme preferences', async ({ page }) => {
  await page.getByRole('button', { name: 'Открыть настройки' }).click()
  const settings = page.getByRole('dialog', { name: 'Настройки' })
  await expect(settings).toBeVisible()

  await settings.getByText('Тёмная', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f1715')

  await settings.getByText('English', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Watering' })).toHaveAttribute('aria-current', 'page')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('translates every product flow while preserving nutrient names', async ({ page }) => {
  await page.getByRole('button', { name: 'Открыть настройки' }).click()
  await page.getByRole('dialog', { name: 'Настройки' }).getByText('English', { exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()

  await expect(page.getByRole('heading', { name: 'Plant light cycle' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Watering schedule' })).toBeVisible()

  await page.getByRole('button', { name: 'My nutrients' }).click()
  await expect(page.getByRole('heading', { name: 'Base nutrients' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Supplements and stimulants' })).toBeVisible()
  await page.getByRole('button', { name: '+ Add nutrient' }).click()
  const library = page.getByRole('dialog', { name: 'Add nutrients' })
  await expect(library.getByRole('heading', { name: 'Manufacturers' })).toBeVisible()
  await library.getByRole('button', { name: /Simplex/ }).click()
  await expect(library.getByText('КалМаг Плюс', { exact: true })).toBeVisible()
  await expect(library.getByText(/Plant supplement for all growing media/).first()).toBeVisible()
  await library.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'My recipe' }).click()
  await expect(page.getByRole('heading', { name: 'Growing method' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Calculation results' })).toBeVisible()
  await expect(page.getByText(/This calculation is for reference only/)).toBeVisible()
})

test('keeps the mobile navigation fixed and content within the viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only layout assertion')

  const navigation = page.getByRole('navigation', { name: 'Разделы приложения' })
  const mobileNavigation = page.locator('.mobile-nav-dock')
  await expect(page.locator('.mobile-nav-dock')).toHaveCSS('position', 'fixed')
  await expect(navigation).toHaveCSS('position', 'static')
  await expect(page.getByRole('button', { name: 'Полив' })).toHaveCSS('min-height', '48px')

  const calculatorButton = mobileNavigation.getByRole('button', { name: 'Полив' })
  const fertilizersButton = mobileNavigation.getByRole('button', { name: 'Мои удобрения' })
  const recipeButton = mobileNavigation.getByRole('button', { name: 'Мой рецепт' })
  await expect(calculatorButton).toHaveCSS('color', 'rgb(40, 111, 145)')
  await fertilizersButton.click()
  await expect(fertilizersButton).toHaveAttribute('aria-current', 'page')
  await expect(fertilizersButton).toHaveCSS('color', 'rgb(22, 122, 105)')
  await recipeButton.click()
  await expect(recipeButton).toHaveAttribute('aria-current', 'page')
  await expect(recipeButton).toHaveCSS('color', 'rgb(98, 88, 147)')

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell')!.getBoundingClientRect()
    const dock = document.querySelector<HTMLElement>('.mobile-nav-dock')!.getBoundingClientRect()
    const tabsStyle = getComputedStyle(document.querySelector<HTMLElement>('.page-tabs')!)
    const shellStyle = getComputedStyle(document.querySelector<HTMLElement>('.app-shell')!)
    const panelStyle = getComputedStyle(document.querySelector<HTMLElement>('.swipe-panel')!)
    const tabs = document.querySelector<HTMLElement>('.page-tabs')!.getBoundingClientRect()
    return {
      shellReachesBottom: Math.abs(window.innerHeight - shell.bottom) < 1,
      navigationIsCompact: tabs.height < 80,
      dockBottomGap: window.innerHeight - dock.bottom,
      capsuleIsVisible: tabsStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && tabsStyle.borderBottomLeftRadius !== '0px',
      canvasHasNoSafeAreaPadding: shellStyle.paddingTop === '0px' && shellStyle.paddingBottom === '0px',
      contentKeepsSafeSpacing: Number.parseFloat(panelStyle.paddingTop) > 70 && Number.parseFloat(panelStyle.paddingBottom) > 50,
      contentClearsNavigation: Number.parseFloat(panelStyle.paddingBottom) > tabs.height + 12,
      contentHasEdgeSpace: Number.parseFloat(panelStyle.paddingLeft) >= 2 && Number.parseFloat(panelStyle.paddingRight) >= 2,
      hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
    }
  })
  expect(geometry.shellReachesBottom).toBe(true)
  expect(geometry.navigationIsCompact).toBe(true)
  expect(geometry.dockBottomGap).toBe(0)
  expect(geometry.capsuleIsVisible).toBe(true)
  expect(geometry.canvasHasNoSafeAreaPadding).toBe(true)
  expect(geometry.contentKeepsSafeSpacing).toBe(true)
  expect(geometry.contentClearsNavigation).toBe(true)
  expect(geometry.contentHasEdgeSpace).toBe(true)
  expect(geometry.hasHorizontalOverflow).toBe(false)
})

test('keeps settings available and turns the mobile brand into a back-to-top action', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only header assertion')

  const panel = page.locator('.swipe-panel').first()
  const brand = page.locator('.topbar__brand')
  const settings = page.getByRole('button', { name: 'Открыть настройки' })
  await panel.evaluate((element) => { element.scrollTop = 70 })
  await expect(brand).toBeEnabled()
  await expect(brand).toHaveAttribute('aria-label', 'Вернуться наверх')
  await expect(settings).toBeVisible()
  await brand.click()
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0)
})

test('shows the install hint only in a mobile browser, not in an installed PWA', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only installation hint assertion')

  await expect(page.locator('.install-hint')).toBeVisible()
  await expect(page.locator('.install-hint')).toContainText('Установите приложение через меню браузера')

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    })
  })
  await page.reload()
  await expect(page.locator('.install-hint')).toContainText('в Safari нажмите «Поделиться»')

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
  })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-standalone', '')
  await expect(page.locator('.install-hint')).toHaveCount(0)
  await expect(page.locator('body > .mobile-nav-dock')).toBeVisible()
  await expect(page.locator('body > .mobile-nav-dock')).toHaveCSS('transform', 'none')
})

test('switches sections with horizontal swipes without hijacking vertical gestures', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only gesture assertion')

  const dispatchSwipe = async (start: { x: number; y: number }, end: { x: number; y: number }) => {
    await page.locator('.app-shell').evaluate((main, points) => {
      const touch = (point: { x: number; y: number }) => new Touch({
        identifier: 1,
        target: main,
        clientX: point.x,
        clientY: point.y,
      })
      main.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch(points.start)],
        changedTouches: [touch(points.start)],
      }))
      main.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [touch(points.end)],
      }))
    }, { start, end })
  }

  await dispatchSwipe({ x: 340, y: 500 }, { x: 120, y: 510 })
  await expect(page.getByRole('button', { name: 'Мои удобрения' })).toHaveAttribute('aria-current', 'page')
  await page.waitForTimeout(320)

  await dispatchSwipe({ x: 340, y: 500 }, { x: 120, y: 510 })
  await expect(page.getByRole('button', { name: 'Мой рецепт' })).toHaveAttribute('aria-current', 'page')
  await page.waitForTimeout(320)

  await dispatchSwipe({ x: 120, y: 500 }, { x: 340, y: 490 })
  await expect(page.getByRole('button', { name: 'Мои удобрения' })).toHaveAttribute('aria-current', 'page')
  await page.waitForTimeout(320)

  await dispatchSwipe({ x: 220, y: 300 }, { x: 235, y: 520 })
  await expect(page.getByRole('button', { name: 'Мои удобрения' })).toHaveAttribute('aria-current', 'page')

  await dispatchSwipe({ x: 300, y: 900 }, { x: 260, y: 903 })
  await expect(page.getByRole('button', { name: 'Мой рецепт' })).toHaveAttribute('aria-current', 'page')
})

test('gives every mobile page an independent scroll container', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only swipe layout assertion')

  const readGeometry = () => page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.swipe-viewport')!
    const track = document.querySelector<HTMLElement>('.swipe-track')!
    const activePanel = document.querySelector<HTMLElement>('.swipe-panel[aria-hidden="false"]')!
    return {
      viewportHeight: viewport.getBoundingClientRect().height,
      viewportLeft: viewport.getBoundingClientRect().left,
      trackHeight: track.getBoundingClientRect().height,
      activeLeft: activePanel.getBoundingClientRect().left,
      activeClientHeight: activePanel.clientHeight,
      activeScrollHeight: activePanel.scrollHeight,
      overflow: getComputedStyle(viewport).overflow,
      panelOverflowY: getComputedStyle(activePanel).overflowY,
      bodyOverflow: getComputedStyle(document.body).overflow,
      hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
    }
  })

  for (const pageName of ['Полив', 'Мои удобрения', 'Мой рецепт']) {
    await page.getByRole('button', { name: pageName }).click()
    await expect.poll(async () => {
      const geometry = await readGeometry()
      return Math.abs(geometry.viewportHeight - geometry.activeClientHeight) < 2
        && Math.abs(geometry.viewportLeft - geometry.activeLeft) < 0.02
        && Math.abs(geometry.trackHeight - geometry.viewportHeight) < 2
        && geometry.overflow === 'hidden'
        && geometry.panelOverflowY === 'auto'
        && geometry.bodyOverflow === 'hidden'
        && geometry.activeScrollHeight >= geometry.activeClientHeight
        && !geometry.hasHorizontalOverflow
    }).toBe(true)
  }

})

test('preserves the scroll position of each mobile page', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only scroll container assertion')

  const calculatorPanel = page.locator('.swipe-panel').nth(0)
  await calculatorPanel.evaluate((panel) => panel.scrollTo({ top: 520 }))
  await expect.poll(() => calculatorPanel.evaluate((panel) => panel.scrollTop)).toBeGreaterThan(300)

  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  const fertilizersPanel = page.locator('.swipe-panel').nth(1)
  await fertilizersPanel.evaluate((panel) => panel.scrollTo({ top: 180 }))
  const fertilizerScrollTop = await fertilizersPanel.evaluate((panel) => panel.scrollTop)

  await page.getByRole('button', { name: 'Полив' }).click()
  await expect.poll(() => calculatorPanel.evaluate((panel) => panel.scrollTop)).toBeGreaterThan(300)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expect.poll(() => fertilizersPanel.evaluate((panel) => panel.scrollTop)).toBe(fertilizerScrollTop)
})
