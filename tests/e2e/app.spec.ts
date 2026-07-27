import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('switches between all application sections', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Калькулятор автополива' })).toBeVisible()

  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expect(page.getByRole('heading', { name: 'Мои удобрения' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Мои удобрения' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await expect(page.getByRole('heading', { name: 'Мой рецепт' })).toBeVisible()
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

test('persists calculator settings after reload', async ({ page }) => {
  const waterings = page.getByRole('slider', { name: 'Количество включений' })
  await waterings.fill('2')
  await expect(waterings).toHaveValue('2')

  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByRole('slider', { name: 'Количество включений' })).toHaveValue('2')
})

test('recovers from corrupted saved settings', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('dripcalc:params:v2', '{broken json'))
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Калькулятор автополива' })).toBeVisible()
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

test('keeps the mobile navigation fixed and content within the viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only layout assertion')

  const navigation = page.getByRole('navigation', { name: 'Разделы приложения' })
  await expect(navigation).toHaveCSS('position', 'fixed')
  await expect(page.getByRole('button', { name: 'Полив' })).toHaveCSS('min-height', '58px')

  const hasHorizontalOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
  expect(hasHorizontalOverflow).toBe(false)
})
