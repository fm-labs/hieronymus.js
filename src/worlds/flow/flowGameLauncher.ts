import { FlowProjection } from '../isoflow/isoflow.draw.ts'
import { createFlowLauncher } from '../isoflow/isoflowGameLauncher.ts'

/**
 * The top-down version of the 'isoflow' world: the same workflows, cards and runs, seen from above,
 * flowing left to right. ?flow=<id>, ?graph=<url> and ?select=<node id> work the same.
 */
export const flowGameLauncher = createFlowLauncher({
  id: 'flow',
  name: 'Flow',
  projection: FlowProjection.ortho,
})
