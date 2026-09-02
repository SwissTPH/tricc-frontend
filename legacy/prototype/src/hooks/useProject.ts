import { useState, useEffect } from 'react'
import { TriccProject, TriccActivity, CodeSystem, Concept } from '../types'

// Default project template for new users
const createDefaultProject = (): TriccProject => ({
  id: '1',
  title: 'Sample Clinical Decision Support Project',
  description: 'A sample project for demonstrating TRICC capabilities',
  langCode: 'en',
  activities: {
    '1': {
      id: '1',
      name: 'Patient Assessment',
      type: 'normal',
      nodes: [],
      edges: [],
      dataInputs: [],
      dataOutputs: [],
      conformanceRules: [],
      starts: [],
    },
    '2': {
      id: '2',
      name: 'Diagnosis Workflow',
      type: 'segment',
      trigger: 'diagnosis-trigger',
      nodes: [],
      edges: [],
      dataInputs: [],
      dataOutputs: [],
      conformanceRules: [],
      starts: [],
    },
  },
  segments: {
    'diagnosis-segment': ['2'],
  },
  order: ['1', '2'],
  contexts: [],
  codeSystems: {
    FHIRcodesystem: {
      id: 'FHIRcodesystem',
      name: 'FHIR Code System',
      description: 'Default custom code system for FHIR concepts',
      concepts: [],
    },
  },
  valueSets: {},
})

// localStorage keys
const PROJECT_STORAGE_KEY = 'tricc_project'
const PROJECT_ACTIVITIES_KEY = 'tricc_activities'

// Utility functions for localStorage
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return defaultValue
  }
}

export const useProject = () => {
  const [currentProject, setCurrentProject] = useState<TriccProject | null>(null)
  const [loading, setLoading] = useState(true)

  // Load project data from localStorage on initialization
  useEffect(() => {
    const loadProject = () => {
      // Check if project exists in localStorage
      let project = loadFromStorage<TriccProject | null>(PROJECT_STORAGE_KEY, null)
      let activities = loadFromStorage<Record<string, TriccActivity>>(PROJECT_ACTIVITIES_KEY, {})

      // If no project exists, create default and save to storage
      if (!project) {
        project = createDefaultProject()
        // For default project, activities are embedded in the project
        activities = project.activities
        saveToStorage(PROJECT_STORAGE_KEY, project)
        saveToStorage(PROJECT_ACTIVITIES_KEY, activities)
      } else {
        // Merge activities from storage with project activities
        project.activities = { ...project.activities, ...activities }
      }

      setCurrentProject(project)
      setLoading(false)
    }

    loadProject()
  }, [])

  const activities = currentProject?.activities || {}

  const createActivity = (activity: Omit<TriccActivity, 'id'>) => {
    if (!currentProject) return

    const newId = (Object.keys(activities).length + 1).toString()
    const newActivity: TriccActivity = {
      ...activity,
      id: newId,
    }

    setCurrentProject({
      ...currentProject,
      activities: {
        ...activities,
        [newId]: newActivity,
      },
    })
  }

  const updateActivity = (activityId: string, updates: Partial<TriccActivity>) => {
    if (!currentProject) return

    const updatedActivities = {
      ...activities,
      [activityId]: {
        ...activities[activityId],
        ...updates,
      },
    }

    setCurrentProject({
      ...currentProject,
      activities: updatedActivities,
    })

    // Persist to localStorage
    saveToStorage(PROJECT_ACTIVITIES_KEY, updatedActivities)
  }

  const deleteActivity = (activityId: string) => {
    if (!currentProject) return

    const newActivities = { ...activities }
    delete newActivities[activityId]

    setCurrentProject({
      ...currentProject,
      activities: newActivities,
    })
  }

  const importProject = (
    projectData: TriccProject,
    importedActivities?: Record<string, TriccActivity>,
  ) => {
    if (importedActivities) {
      setCurrentProject({
        ...projectData,
        activities: importedActivities,
      })
    } else {
      setCurrentProject(projectData)
    }
  }

  const updateProject = (updates: Partial<TriccProject>) => {
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      ...updates,
    }

    setCurrentProject(updatedProject)
    // Persist to localStorage
    saveToStorage(PROJECT_STORAGE_KEY, updatedProject)
  }

  // Code system management functions
  const createCodeSystem = (codeSystem: Omit<CodeSystem, 'id' | 'concepts'>) => {
    if (!currentProject) return

    const newId = `codesystem-${Date.now()}`
    const newCodeSystem: CodeSystem = {
      ...codeSystem,
      id: newId,
      concepts: [],
    }

    const updatedCodeSystems = {
      ...currentProject.codeSystems,
      [newId]: newCodeSystem,
    }

    updateProject({ codeSystems: updatedCodeSystems })
    return newId
  }

  const addConceptToCodeSystem = (codeSystemId: string, concept: Concept) => {
    if (!currentProject || !currentProject.codeSystems[codeSystemId]) return

    const codeSystem = currentProject.codeSystems[codeSystemId]
    const updatedCodeSystem = {
      ...codeSystem,
      concepts: [...codeSystem.concepts, concept],
    }

    const updatedCodeSystems = {
      ...currentProject.codeSystems,
      [codeSystemId]: updatedCodeSystem,
    }

    updateProject({ codeSystems: updatedCodeSystems })
  }

  const getAllConcepts = () => {
    if (!currentProject) return []

    return Object.values(currentProject.codeSystems).flatMap((cs) => cs.concepts)
  }

  const getCodeSystems = () => {
    return currentProject?.codeSystems || {}
  }

  return {
    currentProject,
    activities,
    loading,
    createActivity,
    updateActivity,
    deleteActivity,
    importProject,
    updateProject,
    createCodeSystem,
    addConceptToCodeSystem,
    getAllConcepts,
    getCodeSystems,
  }
}
