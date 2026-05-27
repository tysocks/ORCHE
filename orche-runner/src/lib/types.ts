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

export type OperationStep = {
  id: string
  title: string
  bodyMarkdown: string
  inputs: OrcheInput[]
}

export type ParsedOperation = {
  opId: string
  title: string
  estimatedMinutes?: number
  introMarkdown: string
  requiredTools?: string[]
  steps: OperationStep[]
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
