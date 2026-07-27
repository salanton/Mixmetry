import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_FERTILIZERS, FERTILIZER_LIBRARY } from '../data/fertilizerLibrary'
import type { FertilizerItem } from '../types'

const STORAGE_KEY = 'dripcalc:fertilizers:v1'

const REPLACED_LIBRARY_IDS: Record<string, string> = {
  'simplex-hydro-vega-a': 'simplex-hydro-vega-ab',
  'simplex-hydro-vega-b': 'simplex-hydro-vega-ab',
  'simplex-hydro-bloom-a': 'simplex-hydro-bloom-ab',
  'simplex-hydro-bloom-b': 'simplex-hydro-bloom-ab',
  'simplex-coco-a': 'simplex-coco-ab',
  'simplex-coco-b': 'simplex-coco-ab',
}

const REMOVED_LIBRARY_IDS = new Set([
  'base-ab',
  'root-stimulator',
  'pk-booster',
  'calmag',
  'silicon',
  'enzymes',
  'simplex-ph-plus',
  'simplex-ph-minus',
  'simplex-ph-perfect',
  'simplex-ph-test',
])

export const sanitizeFertilizers = (payload: unknown): FertilizerItem[] => {
  if (!Array.isArray(payload)) return DEFAULT_FERTILIZERS

  const items = payload
    .map((item): FertilizerItem | null => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Partial<FertilizerItem>
      if (!candidate.id) return null
      const candidateId = String(candidate.id)
      if (REMOVED_LIBRARY_IDS.has(candidateId)) return null

      const itemId = REPLACED_LIBRARY_IDS[candidateId] ?? candidateId
      const libraryMatch = FERTILIZER_LIBRARY.find((libraryItem) => libraryItem.id === itemId)
      return libraryMatch ?? null
    })
    .filter((item): item is FertilizerItem => Boolean(item))
    .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.id === item.id) === index)

  return items.length > 0 ? items : DEFAULT_FERTILIZERS
}

export const usePersistentFertilizers = () => {
  const [fertilizers, setFertilizers] = useState<FertilizerItem[]>(DEFAULT_FERTILIZERS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setFertilizers(sanitizeFertilizers(JSON.parse(raw)))
      }
    } catch {
      setFertilizers(DEFAULT_FERTILIZERS)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fertilizers))
    } catch {
      // The app remains usable when browser storage is unavailable or full.
    }
  }, [fertilizers, hydrated])

  const fertilizerIds = useMemo(() => new Set(fertilizers.map((item) => item.id)), [fertilizers])

  const addFromLibrary = (preset: FertilizerItem, options?: { replaceBaseLine?: boolean }) => {
    setFertilizers((items) => {
      if (items.some((item) => item.id === preset.id)) return items

      const retainedItems =
        options?.replaceBaseLine && preset.categoryId === 'base'
          ? items.filter((item) => item.categoryId !== 'base')
          : items

      return [...retainedItems, preset]
    })
  }

  const deleteFertilizer = (id: string) => {
    setFertilizers((items) => items.filter((item) => item.id !== id))
  }

  return {
    fertilizers,
    fertilizerIds,
    addFromLibrary,
    deleteFertilizer,
  }
}
