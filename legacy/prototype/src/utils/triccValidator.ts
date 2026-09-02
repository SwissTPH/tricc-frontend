/**
 * Validation utilities for Tricc project data
 */

import { TriccProject, TriccActivity, TriccNode, TriccNodeType } from '../types'

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  location?: string
}

/**
 * Validate a Tricc project
 */
export const validateProject = (
  project: TriccProject,
  activities: Record<string, TriccActivity>,
): ValidationError[] => {
  const errors: ValidationError[] = []

  // Validate project metadata
  if (!project.id || project.id.trim() === '') {
    errors.push({ type: 'error', message: 'Project ID is required' })
  }
  if (!project.title || project.title.trim() === '') {
    errors.push({ type: 'error', message: 'Project title is required' })
  }
  if (!project.langCode || project.langCode.trim() === '') {
    errors.push({ type: 'warning', message: 'Language code is missing, defaulting to "en"' })
  }

  // Validate activities
  if (!activities || Object.keys(activities).length === 0) {
    errors.push({ type: 'warning', message: 'Project has no activities' })
  } else {
    Object.values(activities).forEach((activity) => {
      errors.push(...validateActivity(activity))
    })
  }

  // Validate order references
  if (project.order && project.order.length > 0) {
    project.order.forEach((ref) => {
      if (!activities[ref]) {
        // Could be a CPG process name, just warn
        errors.push({
          type: 'warning',
          message: `Order references unknown activity or process: ${ref}`,
        })
      }
    })
  }

  return errors
}

/**
 * Validate a Tricc activity
 */
export const validateActivity = (activity: TriccActivity): ValidationError[] => {
  const errors: ValidationError[] = []
  const location = `Activity: ${activity.name}`

  // Basic validation
  if (!activity.id || activity.id.trim() === '') {
    errors.push({ type: 'error', message: 'Activity ID is required', location })
  }
  if (!activity.name || activity.name.trim() === '') {
    errors.push({ type: 'error', message: 'Activity name is required', location })
  }

  // Validate segment-specific fields
  if (activity.type === 'segment') {
    if (!activity.trigger) {
      errors.push({
        type: 'warning',
        message: 'Segment activity should have a trigger defined',
        location,
      })
    }
  }

  // Validate nodes
  if (!activity.nodes || activity.nodes.length === 0) {
    errors.push({ type: 'warning', message: 'Activity has no nodes', location })
  } else {
    const nodeIds = new Set(activity.nodes.map((n) => n.id))

    activity.nodes.forEach((node) => {
      errors.push(...validateNode(node, location))
    })

    // Validate edges reference existing nodes
    if (activity.edges) {
      activity.edges.forEach((edge) => {
        if (!nodeIds.has(edge.source)) {
          errors.push({
            type: 'error',
            message: `Edge references non-existent source node: ${edge.source}`,
            location,
          })
        }
        if (!nodeIds.has(edge.target)) {
          errors.push({
            type: 'error',
            message: `Edge references non-existent target node: ${edge.target}`,
            location,
          })
        }
      })
    }

    // Check for start nodes
    const startNodes = activity.nodes.filter(
      (n) => n.type === TriccNodeType.START || n.type === TriccNodeType.ACTIVITY_START,
    )
    if (startNodes.length === 0) {
      errors.push({
        type: 'warning',
        message: 'Activity has no start nodes',
        location,
      })
    }

    // Check for end nodes
    const endNodes = activity.nodes.filter(
      (n) => n.type === TriccNodeType.END || n.type === TriccNodeType.ACTIVITY_END,
    )
    if (endNodes.length === 0) {
      errors.push({
        type: 'warning',
        message: 'Activity has no end nodes',
        location,
      })
    }
  }

  return errors
}

/**
 * Validate a Tricc node
 */
export const validateNode = (node: TriccNode, activityLocation: string): ValidationError[] => {
  const errors: ValidationError[] = []
  const location = `${activityLocation} > Node: ${node.id}`

  // Basic validation
  if (!node.id || node.id.trim() === '') {
    errors.push({ type: 'error', message: 'Node ID is required', location })
  }
  if (!node.type) {
    errors.push({ type: 'error', message: 'Node type is required', location })
  }
  if (!node.data || !node.data.label) {
    errors.push({ type: 'warning', message: 'Node label is missing', location })
  }

  // Validate node-type-specific requirements
  if (node.type === TriccNodeType.SELECT_ONE || node.type === TriccNodeType.SELECT_MULTIPLE) {
    if (!node.data.options || node.data.options.length === 0) {
      errors.push({
        type: 'warning',
        message: 'Select node should have options defined',
        location,
      })
    }
  }

  // Validate calculate nodes should have expressions
  if (node.type === TriccNodeType.CALCULATE) {
    if (!node.data.expression || node.data.expression.trim() === '') {
      errors.push({
        type: 'warning',
        message: 'Calculate node should have an expression',
        location,
      })
    }
  }

  // Validate link nodes should have a link reference
  if (
    node.type === TriccNodeType.GOTO ||
    node.type === TriccNodeType.LINK_IN ||
    node.type === TriccNodeType.LINK_OUT ||
    node.type === TriccNodeType.ACTIVITY
  ) {
    if (!node.data.link || node.data.link.trim() === '') {
      errors.push({
        type: 'warning',
        message: 'Link node should have a link reference',
        location,
      })
    }
  }

  return errors
}

/**
 * Check if JSON string is valid Tricc project format
 */
export const isValidTriccJSON = (jsonString: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  try {
    const data = JSON.parse(jsonString)

    // Check for required fields
    if (!data.id) errors.push('Missing required field: id')
    if (!data.title) errors.push('Missing required field: title')
    if (!data.description) errors.push('Missing required field: description')

    // Check if activities exist
    if (!data.activities) {
      errors.push('Missing activities array')
    } else if (!Array.isArray(data.activities)) {
      errors.push('Activities must be an array')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  } catch (e) {
    return {
      valid: false,
      errors: ['Invalid JSON format: ' + (e as Error).message],
    }
  }
}

/**
 * Get validation summary
 */
export const getValidationSummary = (errors: ValidationError[]): string => {
  const errorCount = errors.filter((e) => e.type === 'error').length
  const warningCount = errors.filter((e) => e.type === 'warning').length

  if (errorCount === 0 && warningCount === 0) {
    return 'No issues found'
  }

  const parts: string[] = []
  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`)
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`)
  }

  return parts.join(', ')
}
