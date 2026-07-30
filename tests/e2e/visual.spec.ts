import { expect, test } from '@playwright/test'

const screenshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.01,
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dripcalc:install-hint-dismissed', '1')
  })
  await page.goto('./')
})

test('@visual matches the key mobile application states', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only visual baseline')

  await expect(page).toHaveScreenshot('watering-light.png', screenshotOptions)

  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expect(page).toHaveScreenshot('fertilizers-light.png', screenshotOptions)

  await page.getByRole('button', { name: '+ Выбрать базу' }).click()
  let dialog = page.getByRole('dialog', { name: 'Добавление удобрений' })
  await dialog.getByRole('button', { name: /Simplex/ }).click()
  await dialog.getByRole('button', { name: 'Добавить Кокос A+B' }).click()
  await page.getByRole('button', { name: 'Кокос A+B' }).click()
  await expect(page.getByRole('dialog', { name: 'Карточка удобрения Кокос A+B' })).toHaveScreenshot(
    'fertilizer-details-light.png',
    screenshotOptions,
  )
  await page.getByRole('button', { name: 'Закрыть' }).click()

  await page.getByRole('button', { name: 'Открыть настройки' }).click()
  dialog = page.getByRole('dialog', { name: 'Настройки' })
  await dialog.getByText('Тёмная', { exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await expect(page).toHaveScreenshot('recipe-dark.png', screenshotOptions)
})
