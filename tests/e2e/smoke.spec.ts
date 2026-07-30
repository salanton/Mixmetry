import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('opens and navigates between the primary sections', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Световой режим растений' })).toBeVisible()

  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expect(page.getByRole('heading', { name: 'База' })).toBeVisible()

  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await expect(page.getByRole('heading', { name: 'Результаты расчета' })).toBeVisible()
})

test('persists calculator settings after reload', async ({ page }) => {
  const waterings = page.getByRole('slider', { name: 'Количество включений' })
  await waterings.fill('2')
  await page.waitForTimeout(500)
  await page.reload()

  await expect(page.getByRole('slider', { name: 'Количество включений' })).toHaveValue('2')
})
