/** Left = true, right = false. Falls back to Y/N or Yes/No. */
export function checkboxChoiceLabels(
  def: { options?: string[] },
  style: 'short' | 'long' = 'short',
): { trueLabel: string; falseLabel: string } {
  if (def.options && def.options.length >= 2) {
    return { trueLabel: def.options[0], falseLabel: def.options[1] }
  }
  return style === 'long'
    ? { trueLabel: 'Yes', falseLabel: 'No' }
    : { trueLabel: 'Y', falseLabel: 'N' }
}

export function isCheckboxAnswered(value: unknown): boolean {
  return value === true || value === false
}
