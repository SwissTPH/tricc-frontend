// Export generators for different formats
// These generate files independently without Python dependencies

import { TriccProject, TriccActivity } from '../types'
import JSZip from 'jszip'

/**
 * Generate BPMN XML from activity nodes and edges
 */
export function generateBPMN(activity: TriccActivity): string {
  const { nodes, edges } = activity

  // BPMN XML template
  const bpmnTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_${activity.id}" isExecutable="false">
    ${nodes.map((node) => generateBPMNNode(node)).join('\n    ')}
    ${edges.map((edge) => generateBPMNEdge(edge)).join('\n    ')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_${activity.id}">
      ${nodes.map((node, index) => generateBPMNDiagramNode(node, index)).join('\n      ')}
      ${edges.map((edge) => generateBPMNDiagramEdge(edge)).join('\n      ')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

  return bpmnTemplate
}

/**
 * Generate BPMN XML for a single node
 */
function generateBPMNNode(node: any): string {
  const nodeType = node.data?.nodeType || 'task'

  switch (nodeType) {
    case 'start':
      return `<bpmn:startEvent id="${node.id}" name="${node.data?.label || 'Start'}">
      <bpmn:outgoing>Flow_${node.id}_out</bpmn:outgoing>
    </bpmn:startEvent>`

    case 'end':
      return `<bpmn:endEvent id="${node.id}" name="${node.data?.label || 'End'}">
      <bpmn:incoming>Flow_${node.id}_in</bpmn:incoming>
    </bpmn:endEvent>`

    case 'gateway':
    case 'rhombus':
      return `<bpmn:exclusiveGateway id="${node.id}" name="${node.data?.label || 'Decision'}">
      <bpmn:incoming>Flow_${node.id}_in</bpmn:incoming>
      <bpmn:outgoing>Flow_${node.id}_out</bpmn:outgoing>
    </bpmn:exclusiveGateway>`

    case 'select_one':
    case 'select_multiple':
    case 'select_one yesno':
      return `<bpmn:exclusiveGateway id="${node.id}" name="${node.data?.label || 'Select'}">
      <bpmn:incoming>Flow_${node.id}_in</bpmn:incoming>
    </bpmn:exclusiveGateway>`

    default:
      return `<bpmn:task id="${node.id}" name="${node.data?.label || 'Task'}">
      <bpmn:incoming>Flow_${node.id}_in</bpmn:incoming>
      <bpmn:outgoing>Flow_${node.id}_out</bpmn:outgoing>
    </bpmn:task>`
  }
}

/**
 * Generate BPMN XML for a single edge
 */
function generateBPMNEdge(edge: any): string {
  const match = edge.logic?.match(/^\s*\$this\s*=\s*'([^']+)'/)
  const condition = match
    ? `<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" language="text/cql">'${match[1]}' in $this</bpmn:conditionExpression>`
    : ''
  return `<bpmn:sequenceFlow id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}">${condition}</bpmn:sequenceFlow>`
}

/**
 * Generate BPMN diagram layout for a node
 */
function generateBPMNDiagramNode(node: any, index: number): string {
  const x = node.position?.x || index * 150
  const y = node.position?.y || index * 100
  const width = 100
  const height = 80

  return `<bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
      </bpmndi:BPMNShape>`
}

/**
 * Generate BPMN diagram layout for an edge
 */
function generateBPMNDiagramEdge(edge: any): string {
  return `<bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">
        <di:waypoint x="0" y="0" />
        <di:waypoint x="100" y="100" />
      </bpmndi:BPMNEdge>`
}

/**
 * Generate CQL library from activity
 */
export function generateCQL(activity: TriccActivity): string {
  const libraryName = `Activity${activity.id.charAt(0).toUpperCase() + activity.id.slice(1)}`

  return `library ${libraryName} version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

codesystem "Activity Codes": 'http://example.org/fhir/CodeSystem/activity-codes'

context Patient

define "${activity.name}":
  // Activity logic goes here
  // This is a placeholder implementation
  true`
}

/**
 * Generate FHIR code systems and value sets
 */
export function generateFHIR(project: TriccProject): { codeSystems: any[]; valueSets: any[] } {
  // Placeholder FHIR generation
  // In a full implementation, this would extract code systems from project data
  const codeSystems = [
    {
      resourceType: 'CodeSystem',
      id: 'activity-codes',
      url: 'http://example.org/fhir/CodeSystem/activity-codes',
      version: '1.0.0',
      name: 'ActivityCodes',
      title: 'Activity Codes',
      status: 'active',
      content: 'complete',
      concept: Object.keys(project.activities).map((activityId) => ({
        code: activityId,
        display: project.activities[activityId].name,
      })),
    },
  ]

  const valueSets = [
    {
      resourceType: 'ValueSet',
      id: 'activity-types',
      url: 'http://example.org/fhir/ValueSet/activity-types',
      version: '1.0.0',
      name: 'ActivityTypes',
      title: 'Activity Types',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://example.org/fhir/CodeSystem/activity-codes',
            concept: Object.keys(project.activities).map((activityId) => ({
              code: activityId,
              display: project.activities[activityId].name,
            })),
          },
        ],
      },
    },
  ]

  return { codeSystems, valueSets }
}

/**
 * Generate comprehensive ZIP export
 */
export async function generateZIPExport(
  project: TriccProject,
  activities: Record<string, TriccActivity>,
): Promise<Blob> {
  const zip = new JSZip()

  // Add project JSON config
  const projectData = {
    ...project,
    activities: Object.values(activities),
  }
  zip.file('project.json', JSON.stringify(projectData, null, 2))

  // Create directories
  const bpmnFolder = zip.folder('bpmn')
  const cqlFolder = zip.folder('cql')
  const fhirFolder = zip.folder('fhir')

  // Generate BPMN files for each activity
  Object.values(activities).forEach((activity) => {
    const bpmnContent = generateBPMN(activity)
    bpmnFolder?.file(`${activity.id}.bpmn`, bpmnContent)
  })

  // Generate CQL libraries for each activity
  Object.values(activities).forEach((activity) => {
    const cqlContent = generateCQL(activity)
    cqlFolder?.file(`${activity.id}.cql`, cqlContent)
  })

  // Generate FHIR resources
  const { codeSystems, valueSets } = generateFHIR(project)
  codeSystems.forEach((cs) => {
    fhirFolder?.file(`code-system-${cs.id}.json`, JSON.stringify(cs, null, 2))
  })
  valueSets.forEach((vs) => {
    fhirFolder?.file(`value-set-${vs.id}.json`, JSON.stringify(vs, null, 2))
  })

  // Generate and return ZIP blob
  return await zip.generateAsync({ type: 'blob' })
}
