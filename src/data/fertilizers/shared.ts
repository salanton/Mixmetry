import type {
  FertilizerCategory,
  FertilizerItem,
  FertilizerStageLabel,
  FertilizerSolutionTarget,
  FertilizerStageDosage,
  GrowMethod,
  PlantStage,
} from '../../types'

export const PLANT_STAGES: PlantStage[] = [
  {
    id: 'seedling',
    title: 'Проращивание и укоренение',
    description: 'Проявление первой пары листьев',
  },
  {
    id: 'earlyVeg',
    title: 'Вегетативный рост',
    description: 'Набор зеленой массы растения',
  },
  {
    id: 'veg',
    title: 'Предцвет',
    description: 'Набор зеленой массы растения, начало образования соцветий',
  },
  {
    id: 'preFlower',
    title: 'Начало цветения',
    description: 'Замедление роста растения, развитие соцветий',
  },
  {
    id: 'earlyBloom',
    title: 'Развитие цветков',
    description: 'Уплотнение соцветий, остановка вертикального роста растения',
  },
  {
    id: 'midBloom',
    title: 'Созревание',
    description: 'Остановка роста соцветий',
  },
  {
    id: 'lateBloom',
    title: 'Промывка',
    description: 'Подготовка к сбору урожая',
  },
]

export const GROW_METHODS: GrowMethod[] = [
  { id: 'hydro', title: 'Гидропоника' },
  { id: 'coco', title: 'Кокос' },
  { id: 'soil', title: 'Земля' },
]

const parseDosageAmount = (amount: number | string | null) => {
  if (amount === null) return null
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : null

  const values = amount
    .replace(',', '.')
    .split('-')
    .map((value) => Number.parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) return null
  if (values.length === 1) return values[0]
  return (values[0] + values[1]) / 2
}

type DosageInput = number | string | null | {
  amount: number | string | null
  label?: string
}

const getDosageAmount = (input: DosageInput) =>
  input && typeof input === 'object' ? input.amount : input

const getDosageLabel = (input: DosageInput, amountMlPerLiter: number | null) => {
  if (input && typeof input === 'object') return input.label
  return typeof input === 'string' && amountMlPerLiter !== null ? input : undefined
}

export const dose = (amount: number | string | null, label: string): DosageInput => ({ amount, label })

const getNumericValues = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return []
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : []
  return [...value.replace(',', '.').matchAll(/\d+(?:\.\d+)?/g)]
    .map(([match]) => Number.parseFloat(match))
    .filter((number) => Number.isFinite(number))
}

const formatCompactNumber = (value: number) => {
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

const mergeRangeValue = (first: string | null, second: string | null) => {
  if (!first) return second
  if (!second || first === second) return first

  const values = [...getNumericValues(first), ...getNumericValues(second)]
  if (values.length === 0) return first

  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? formatCompactNumber(min) : `${formatCompactNumber(min)}-${formatCompactNumber(max)}`
}

const mergeDosageInput = (first: DosageInput, second: DosageInput): DosageInput => {
  if (first === null) return second
  if (second === null) return first

  const firstAmount = getDosageAmount(first)
  const secondAmount = getDosageAmount(second)
  const firstLabel = getDosageLabel(first, parseDosageAmount(firstAmount))
  const secondLabel = getDosageLabel(second, parseDosageAmount(secondAmount))
  const firstSource = firstLabel ?? firstAmount
  const secondSource = secondLabel ?? secondAmount
  const values = [...getNumericValues(firstSource), ...getNumericValues(secondSource)]

  if (values.length === 0) return first

  const min = Math.min(...values)
  const max = Math.max(...values)
  const amount = min === max ? formatCompactNumber(min) : `${formatCompactNumber(min)}-${formatCompactNumber(max)}`
  const unit = /(?:г|g|gr)\s*\/\s*(?:л|l)/i.test(`${firstLabel ?? ''} ${secondLabel ?? ''}`) ? ' г/л' : ''

  return unit ? dose(amount, `${amount}${unit}`) : amount
}

export const dosageSchedule = (amounts: DosageInput[]): FertilizerStageDosage[] =>
  PLANT_STAGES.map((stage, index) => {
    const input = amounts[index] ?? null
    const amount = getDosageAmount(input)
    const amountMlPerLiter = parseDosageAmount(amount)

    return {
      stageId: stage.id,
      amountMlPerLiter,
      amountLabel: getDosageLabel(input, amountMlPerLiter),
    }
  })

const solutionTargetSchedule = (
  phRanges: Array<string | null>,
  ecRanges: Array<string | null>,
): FertilizerSolutionTarget[] =>
  PLANT_STAGES.map((stage, index) => ({
    stageId: stage.id,
    phRange: phRanges[index] ?? null,
    ecRange: ecRanges[index] ?? null,
  }))

export const taDosageSchedule = (amounts: DosageInput[]): FertilizerStageDosage[] =>
  dosageSchedule([
    mergeDosageInput(amounts[0] ?? null, amounts[1] ?? null),
    amounts[2] ?? null,
    amounts[3] ?? null,
    amounts[4] ?? null,
    amounts[4] ?? null,
    amounts[5] ?? null,
    amounts[6] ?? null,
  ])

const taSolutionTargetSchedule = (
  phRanges: Array<string | null>,
  ecRanges: Array<string | null>,
): FertilizerSolutionTarget[] =>
  solutionTargetSchedule(
    [
      mergeRangeValue(phRanges[0] ?? null, phRanges[1] ?? null),
      phRanges[2] ?? null,
      phRanges[3] ?? null,
      phRanges[4] ?? null,
      phRanges[4] ?? null,
      phRanges[5] ?? null,
      phRanges[6] ?? null,
    ],
    [
      mergeRangeValue(ecRanges[0] ?? null, ecRanges[1] ?? null),
      ecRanges[2] ?? null,
      ecRanges[3] ?? null,
      ecRanges[4] ?? null,
      ecRanges[4] ?? null,
      ecRanges[5] ?? null,
      ecRanges[6] ?? null,
    ],
  )

export const EMPTY_STAGE_DOSAGES = dosageSchedule([null, null, null, null, null, null, null])

export const SIMPLEX_STARTUP_TARGETS = solutionTargetSchedule(
  ['6.5', '6.5', '6.5', null, null, null, null],
  ['0.5-0.6', '0.6-1.1', '1.1-1.4', null, null, null, null],
)

export const PH_PERFECT_TARGETS = solutionTargetSchedule(
  ['5.5-6.3', '5.5-6.3', '5.5-6.3', '5.5-6.3', '5.5-6.3', '5.5-6.3', null],
  [null, null, null, null, null, null, null],
)

export const SIMPLEX_HYDRO_TARGETS = solutionTargetSchedule(
  ['5.5-5.9', '5.5-5.9', '5.5-5.9', '6.0-6.5', '6.0-6.5', '6.0-6.5', '6.0-6.5'],
  ['0.4-0.6', '0.9-1.3', '1.5-1.9', '1.8-2.4', '1.8-2.2', '1.5-1.7', '0.8-0.9'],
)

export const SIMPLEX_COCO_TARGETS = solutionTargetSchedule(
  ['5.5-5.9', '5.5-5.9', '5.5-5.9', '6.0-6.5', '6.0-6.5', '6.0-6.5', '6.0-6.5'],
  ['0.6-0.8', '0.9-1.3', '1.5-1.9', '1.8-2.4', '1.8-2.3', '1.5-2.0', '0.8-0.9'],
)

export const SIMPLEX_TERRA_TARGETS = solutionTargetSchedule(
  ['5.8-6.5', '5.8-6.5', '5.8-6.5', '6.0-6.8', '6.0-6.8', '6.0-6.8', '6.0-6.8'],
  ['0.4-0.6', '0.8-1.2', '1.5-1.9', '1.6-2.0', '1.7-2.2', '1.2-1.8', '0.8-0.9'],
)

export const TA_HYDRO_COCO_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.3-0.6', '0.8-1.2', '1.3-1.8', '1.8-2.0', '1.4-2.2', '1.4-2.6', null],
)

export const TA_SOIL_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.2-0.5', '0.6-1.0', '1.1-1.6', '1.4-1.8', '1.3-1.7', '1.3-2.0', null],
)

export const TA_DRY_HYDRO_COCO_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.2-0.4', '0.6-1.0', '1.3-1.8', '1.6-1.9', '1.8-2.2', '1.4-2.6', null],
)

export const TA_DRY_SOIL_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.1-0.4', '0.6-1.0', '1.0-1.4', '1.2-1.6', '1.3-1.7', '1.3-2.0', null],
)

export const TA_STAGE_LABELS: Partial<Record<PlantStage['id'], FertilizerStageLabel>> = {
  seedling: {
    title: '1st roots / 1st true leaves',
    description: 'Первые корни и первая пара настоящих листьев',
  },
  earlyVeg: {
    title: 'Growing',
    description: 'Вегетативный рост',
  },
  veg: {
    title: 'Preflowering',
    description: 'Предцвет',
  },
  preFlower: {
    title: 'Flowering',
    description: 'Начало цветения',
  },
  earlyBloom: {
    title: 'Flowering',
    description: 'Развитие цветков',
  },
  midBloom: {
    title: 'Ripening',
    description: 'Созревание',
  },
  lateBloom: {
    title: 'Cleaning',
    description: 'Промывка',
  },
}

export const ADVANCED_NUTRIENTS_STAGE_LABELS: Partial<Record<PlantStage['id'], FertilizerStageLabel>> = {
  seedling: {
    title: 'Grow W1',
    description: 'Advanced Nutrients Master Recipe, grow cycle week 1',
  },
  earlyVeg: {
    title: 'Grow W2',
    description: 'Advanced Nutrients Master Recipe, grow cycle week 2',
  },
  veg: {
    title: 'Grow W3-W4',
    description: 'Advanced Nutrients Master Recipe, grow cycle weeks 3-4',
  },
  preFlower: {
    title: 'Bloom W1-W2',
    description: 'Advanced Nutrients Master Recipe, bloom cycle weeks 1-2',
  },
  earlyBloom: {
    title: 'Bloom W3-W4',
    description: 'Advanced Nutrients Master Recipe, bloom cycle weeks 3-4',
  },
  midBloom: {
    title: 'Bloom W5-W7',
    description: 'Advanced Nutrients Master Recipe, bloom cycle weeks 5-7',
  },
  lateBloom: {
    title: 'Flush',
    description: 'Advanced Nutrients nutrient-free flush period',
  },
}

export const AN_ROOT_EXPANDER_STAGE_DOSAGES = dosageSchedule([2, 2, null, 2, null, null, null])
export const AN_FULL_CYCLE_2ML_STAGE_DOSAGES = dosageSchedule([2, 2, 2, 2, 2, 2, null])
export const AN_BLOOM_2ML_STAGE_DOSAGES = dosageSchedule([null, null, null, 2, 2, 2, null])

export const RASTEA_STAGE_LABELS: Partial<Record<PlantStage['id'], FertilizerStageLabel>> = {
  seedling: {
    title: 'Рассада',
    description: 'Старт рассады после проращивания',
  },
  earlyVeg: {
    title: 'Вегетация 18/6, 2-4',
    description: 'Первые недели активной вегетации',
  },
  veg: {
    title: 'Вегетация 18/6, 4+',
    description: 'Поздняя вегетация перед переводом на цветение',
  },
  preFlower: {
    title: 'Цветение 12/12, 1-2',
    description: 'Переход на цветение и первые завязи',
  },
  earlyBloom: {
    title: 'Цветение 12/12, 3-4',
    description: 'Развитие цветков и подключение PK Classic',
  },
  midBloom: {
    title: 'Цветение 12/12, 5-7',
    description: 'Основная фаза набора и созревания',
  },
  lateBloom: {
    title: 'Последняя',
    description: 'Промывка чистой водой',
  },
}

const RASTEA_HYDRO_TARGETS = solutionTargetSchedule(
  ['5.2', '5.2', '5.2', '5.5', '5.5-5.8', '5.8', '5.9'],
  ['<0.8', '<1.5', '<1.8', '2.2-2.3', '2.4-2.6', '2.8', null],
)

const RASTEA_COCO_TARGETS = solutionTargetSchedule(
  ['5.8', '5.8', '5.8', '6.0', '6.0', '6.0', '6.0'],
  ['<0.8', '<1.5', '<1.8', '2.2-2.3', '2.4-2.6', '2.8', null],
)

const RASTEA_SOIL_TARGETS = solutionTargetSchedule(
  ['6.1', '6.1', '6.1', '6.5', '6.5', '6.5', '6.5'],
  ['<0.8', '<1.5', '<1.8', '2.2-2.3', '2.4-2.6', '2.8', null],
)

export const RASTEA_TARGETS_BY_METHOD = {
  hydro: RASTEA_HYDRO_TARGETS,
  coco: RASTEA_COCO_TARGETS,
  soil: RASTEA_SOIL_TARGETS,
}

export const RASTEA_METHOD_TITLES = {
  hydro: 'Hydro',
  coco: 'Coco',
  soil: 'Soil',
}

export const RASTEA_VEGA_STAGE_DOSAGES = dosageSchedule([1, 2, 4, null, null, null, null])
export const RASTEA_FLORES_STAGE_DOSAGES = dosageSchedule([null, null, null, 4, 4, 4, null])

export const FERTILIZER_CATEGORIES: FertilizerCategory[] = [
  {
    id: 'base',
    title: 'База',
    description: 'Базовые удобрения для основного питания',
  },
  {
    id: 'boosters',
    title: 'Добавки и стимуляторы',
    description: 'Стимуляторы, бустеры и вспомогательные добавки',
  },
]

export const DEFAULT_FERTILIZERS: FertilizerItem[] = []
