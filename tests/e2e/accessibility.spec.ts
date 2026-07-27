import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const expectNoSeriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')
  expect(violations, violations.map(({ id, help }) => `${id}: ${help}`).join('\n')).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('calculator has no serious accessibility violations', async ({ page }) => {
  await expectNoSeriousViolations(page)
})

test('fertilizers and the add dialog have no serious accessibility violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Мои удобрения' }).click()
  await expectNoSeriousViolations(page)

  await page.getByRole('button', { name: '+ Добавить удобрение' }).click()
  await expectNoSeriousViolations(page)
})

test('recipe has no serious accessibility violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Мой рецепт' }).click()
  await expectNoSeriousViolations(page)
})
