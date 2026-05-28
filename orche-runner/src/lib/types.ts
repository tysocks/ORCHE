export type OrcheInput =
  | {
      id: string
      type: 'text'
      label: string
      required?: boolean
    }
  | {
      id: string
      type: 'textarea'
      label: string
      required?: boolean
    }
  | {
      id: string
      type: 'checkbox'
      label: string
      required?: boolean
      /** Two labels: left/true, right/false (e.g. `["Pass","Fail"]`). */
      options?: string[]
    }
  | {
      id: string
      type: 'number'
      label: string
      required?: boolean
    }
  | {
      id: string
      type: 'select'
      label: string
      required?: boolean
      options: string[]
    }
  | {
      id: string
      type: 'equipment'
      label: string
      part_number?: string
      equipment_id?: string
      required?: boolean
    }

import type { OperationType } from './operationTypes'
import type { RequiredToolEntry } from './tools'

export type { OperationType }
export type { RequiredToolEntry }

export type OperationStep = {
  id: string
  title: string
  bodyMarkdown: string
  inputs: OrcheInput[]
}

export type ChecklistItem = {
  id: string
  number: string
  major: number
  minor: number
  title: string
  inputs: OrcheInput[]
}

export type ChecklistSection = {
  id: string
  number: string
  major: number
  title: string
  note?: string
  items: ChecklistItem[]
}

export type ParsedOperation = {
  opId: string
  title: string
  operationType: OperationType
  estimatedMinutes?: number
  introMarkdown: string
  requiredTools?: Array<string | Record<string, unknown>>
  requiredToolEntries?: RequiredToolEntry[]
  steps: OperationStep[]
  checklistSections?: ChecklistSection[]
  templatePath?: string
}

export type RoutingRow = {
  operationNo: number
  operationId: string
  operationName: string
  nextOperationNo: number | null
}

export type WorkOrderOperation = RoutingRow & {
  templatePath: string | null
  operationType?: OperationType
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
}

export type WorkOrderSummary = {
  id: string
  partNumber?: string
  serialNumber?: string
  routing?: string
  status?: string
}

export type WorkOrderListItem = {
  id: string
  partNumber: string
  serialNumber: string
  routing: string
  status: string
}

export type ProcessEvent = {
  workOrderId?: string
  operationNo?: number
  opId?: string
  operationName?: string
  kind?: string
  stepId?: string
  inputId?: string
  value?: unknown
  inputs?: Record<string, unknown>
  note?: string
  completedBy?: string
  operatorName?: string
  workShift?: string
  at?: string
}
