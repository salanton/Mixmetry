import type { FertilizerItem } from '../../types'
import { dosageSchedule } from './shared'

export const HIGHROOTS_FERTILIZERS: FertilizerItem[] = [
  {
    id: 'highroots-fish',
    categoryId: 'boosters',
    manufacturer: 'HighRoots',
    growMethodId: 'any',
    name: 'FISH',
    shortDescription: 'Органическая добавка для активного роста',
    description: 'Органическая добавка HighRoots для активного роста и общего развития растения. Подходит для полива или обработки по листу в период, когда растение активно набирает зеленую массу и корневую силу. Лучше использовать отдельно от других добавок HighRoots в день применения, чтобы не перегружать раствор.',
    details: [
      'Методы выращивания: универсальное применение',
      'Применение: полив или опрыскивание по листу',
      'Не смешивать с MUSHROOM или SPIDER в одном растворе',
    ],
    stageDosages: dosageSchedule([2, 2, 2, 2, 2, null, null]),
    source: 'library',
  },
  {
    id: 'highroots-mushroom',
    categoryId: 'boosters',
    manufacturer: 'HighRoots',
    growMethodId: 'any',
    name: 'MUSHROOM',
    shortDescription: 'Органическая добавка для питания',
    description: 'Органическая добавка HighRoots для усиления питания и поддержки обменных процессов. Хорошо подходит как вспомогательная подкормка на активных стадиях, когда растению нужно больше ресурсов для развития. Используй отдельно от FISH и SPIDER в одном растворе, чередуя препараты по дням или поливам.',
    details: [
      'Методы выращивания: универсальное применение',
      'Применение: полив или опрыскивание по листу',
      'Не смешивать с FISH или SPIDER в одном растворе',
    ],
    stageDosages: dosageSchedule([2, 2, 2, 2, 2, null, null]),
    source: 'library',
  },
  {
    id: 'highroots-spider',
    categoryId: 'boosters',
    manufacturer: 'HighRoots',
    growMethodId: 'any',
    name: 'SPIDER',
    shortDescription: 'Органическая добавка для защиты',
    description: 'Органическая добавка HighRoots для защиты и повышения устойчивости растения. Ее логично применять в периоды активного роста, после стрессов или как профилактическую поддержку. Не смешивай с FISH и MUSHROOM в одном растворе, чтобы сохранить предсказуемость схемы и не перегружать растение.',
    details: [
      'Методы выращивания: универсальное применение',
      'Применение: полив или опрыскивание по листу',
      'Не смешивать с FISH или MUSHROOM в одном растворе',
    ],
    stageDosages: dosageSchedule([2, 2, 2, 2, 2, null, null]),
    source: 'library',
  },
]
