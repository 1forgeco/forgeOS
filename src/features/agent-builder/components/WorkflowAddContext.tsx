import { createContext, useContext } from 'react'

export const WorkflowAddContext = createContext<{ requestAddAfter: (nodeId: string) => void }>({
  requestAddAfter: () => undefined,
})

export function useWorkflowAdd() {
  return useContext(WorkflowAddContext)
}
