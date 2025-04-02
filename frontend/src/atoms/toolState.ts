import { atom } from "jotai"

export interface SubTool {
  name: string
  description?: string
  enabled: boolean
}

export interface Tool {
  name: string
  description?: string
  icon?: string
  tools?: SubTool[]
  enabled: boolean
}

export const toolsAtom = atom<Tool[]>([])

export const loadToolsAtom = atom(
  null,
  async (get, set) => {
    const response = await fetch("/api/tools")
    const data = await response.json()
    if (data.success) {
      set(toolsAtom, data.tools)
    }

    return data
  }
)
