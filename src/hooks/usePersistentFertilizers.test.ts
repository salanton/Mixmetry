import { describe, expect, it } from 'vitest'
import { DEFAULT_FERTILIZERS } from '../data/fertilizerLibrary'
import { sanitizeFertilizers } from './usePersistentFertilizers'

describe('sanitizeFertilizers', () => {
  it('falls back to defaults for malformed storage data', () => {
    expect(sanitizeFertilizers({ id: 'invalid' })).toEqual(DEFAULT_FERTILIZERS)
  })

  it('restores current library data instead of stale stored fields', () => {
    const [item] = sanitizeFertilizers([{ id: 'simplex-coco-ab', name: 'Старое имя', source: 'library' }])

    expect(item.id).toBe('simplex-coco-ab')
    expect(item.name).toBe('Кокос A+B')
    expect(item.source).toBe('library')
  })

  it('migrates replaced component ids and removes duplicates', () => {
    const items = sanitizeFertilizers([
      { id: 'simplex-coco-a', source: 'library' },
      { id: 'simplex-coco-ab', source: 'library' },
    ])

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('simplex-coco-ab')
  })

  it('drops former manual entries when valid library selections exist', () => {
    const items = sanitizeFertilizers([
      { id: 'custom-item', name: 'Ручное', source: 'manual' },
      { id: 'simplex-coco-ab', source: 'library' },
    ])

    expect(items.map((item) => item.id)).toEqual(['simplex-coco-ab'])
  })
})
