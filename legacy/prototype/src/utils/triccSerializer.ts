/**
 * Utilities for serializing and deserializing Tricc projects to/from JSON
 */

import { TriccProject, TriccActivity } from '../types'

/**
 * Export a Tricc project to JSON format
 */
export const exportProjectToJSON = (
  project: TriccProject,
  activities: Record<string, TriccActivity>,
): string => {
  const exportData = {
    ...project,
    activities: Object.values(activities),
  }
  return JSON.stringify(exportData, null, 2)
}

/**
 * Download a JSON file
 */
export const downloadJSON = (json: string, filename: string): void => {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse and validate imported JSON project data
 */
export const importProjectFromJSON = (
  jsonString: string,
): { project: TriccProject; activities: Record<string, TriccActivity> } => {
  const data = JSON.parse(jsonString)

  // Extract activities and convert to record
  const activities: Record<string, TriccActivity> = {}
  if (data.activities && Array.isArray(data.activities)) {
    data.activities.forEach((activity: TriccActivity) => {
      activities[activity.id] = activity
    })
  }

  // Extract project metadata
  const project: TriccProject = {
    id: data.id,
    title: data.title,
    description: data.description,
    langCode: data.langCode || 'en',
    activities: activities,
    segments: data.segments || {},
    order: data.order || [],
    contexts: data.contexts || [],
    codeSystems: data.codeSystems || {},
    valueSets: data.valueSets || {},
    mediaPath: data.mediaPath,
    system: data.system,
    code: data.code,
    version: data.version,
  }

  return { project, activities }
}

/**
 * Read a file as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Export project to file
 */
export const exportProject = (
  project: TriccProject,
  activities: Record<string, TriccActivity>,
): void => {
  const json = exportProjectToJSON(project, activities)
  const filename = `${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
  downloadJSON(json, filename)
}

/**
 * Format JSON for display
 */
export const formatJSON = (data: any): string => {
  return JSON.stringify(data, null, 2)
}

/**
 * Create a minimal valid project template
 */
export const createProjectTemplate = (): {
  project: TriccProject
  activities: Record<string, TriccActivity>
} => {
  const projectId = `project-${Date.now()}`
  const activityId = `activity-${Date.now()}`

  const project: TriccProject = {
    id: projectId,
    title: 'New CDSS Project',
    description: 'A new Clinical Decision Support System project',
    langCode: 'en',
    activities: {},
    segments: {},
    order: [],
    contexts: [],
    codeSystems: {},
    valueSets: {},
    version: '1.0.0',
  }

  const activity: TriccActivity = {
    id: activityId,
    name: 'Main Activity',
    type: 'normal',
    nodes: [],
    edges: [],
    dataInputs: [],
    dataOutputs: [],
    conformanceRules: [],
    starts: [],
  }

  return {
    project,
    activities: { [activityId]: activity },
  }
}
