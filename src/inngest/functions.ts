import { inngest } from './client'

export const missionWorkflowHeartbeat = inngest.createFunction(
  {
    id: 'portai-mission-workflow-heartbeat',
    triggers: { event: 'portai/mission.workflow.started' },
    retries: 3,
  },
  async ({ event, step }) => {
    return step.run('record-workflow-start', async () => ({
      missionId: String(event.data.missionId),
      startedAt: new Date().toISOString(),
      status: 'accepted',
    }))
  },
)

export const functions = [missionWorkflowHeartbeat]
