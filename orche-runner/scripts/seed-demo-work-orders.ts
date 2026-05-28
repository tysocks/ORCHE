/**
 * Creates local demo work orders for UI testing.
 * Run: npx tsx scripts/seed-demo-work-orders.ts
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createWorkOrder } from '../server/workOrderService'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const instructionLibraryRoot = path.join(repoRoot, 'instruction-library')
const workOrdersRoot = path.join(repoRoot, 'work-orders')

async function seed(id: string, partNumber: string, serialNumber: string, routing: string) {
  try {
    const result = await createWorkOrder(instructionLibraryRoot, workOrdersRoot, {
      workOrderId: id,
      partNumber,
      serialNumber,
      routing,
    })
    console.log(`Created ${result.id} (${routing}, ${result.templateRefs.length} operations)`)
  } catch (err) {
    if (err instanceof Error && err.message === 'Work order already exists') {
      console.log(`Skipped ${id} (already exists)`)
    } else {
      throw err
    }
  }
}

await seed('WO-LOCAL-DEMO', 'E02-XXXXX', 'SN-DEMO-001', 'TEST')
await seed('WO-DEMO-ASSY', 'E02-XXXXX', 'SN-DEMO-002', 'ASSY')
