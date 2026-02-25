import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeColors = {
  AGENT: '#3b82f6',
  SUPERVISOR: '#f59e0b',
  SQ_REVIEW: '#10b981',
  HUMAN_IN_LOOP: '#8b5cf6',
  NOTIFY: '#06b6d4',
  END: '#ef4444',
};

const statusColors = {
  completed: '#22c55e',
  active: '#3b82f6',
  pending: '#6b7280',
  failed: '#ef4444',
};

function CustomNode({ data }) {
  const bgColor = nodeColors[data.type] || '#3b82f6';
  const borderColor = data.isActive ? '#fbbf24' : statusColors[data.status] || '#6b7280';
  const borderWidth = data.isActive ? 3 : 2;

  return (
    <div
      className="relative px-4 py-3 rounded-lg shadow-xl text-center transition-all"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderStyle: 'solid',
        minWidth: '150px',
        boxShadow: data.isActive
          ? '0 0 20px rgba(251, 191, 36, 0.5)'
          : '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className="text-white font-semibold text-sm">{data.label}</div>
      <div className="text-white/60 text-xs mt-1">{data.phase}</div>
      {data.executionCount > 0 && (
        <div className="mt-2 inline-block px-2 py-0.5 bg-black/30 rounded text-xs text-green-300">
          {data.executionCount}x executed
        </div>
      )}
      <div
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-gray-800"
        style={{ backgroundColor: statusColors[data.status] }}
      />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

// Define the simplified workflow structure matching the actual backend nodes
const workflowStructure = [
  { id: 'intake_node', name: 'Intake', type: 'AGENT', phase: 'INTAKE', row: 0, col: 1 },
  { id: 'application_node', name: 'Application', type: 'AGENT', phase: 'APPLICATION', row: 1, col: 1 },
  { id: 'disclosure_node', name: 'Disclosure', type: 'AGENT', phase: 'DISCLOSURE', row: 2, col: 1 },
  { id: 'loan_review_node', name: 'Loan Review', type: 'AGENT', phase: 'LOAN_REVIEW', row: 3, col: 1 },
  { id: 'underwriting_node', name: 'Underwriting', type: 'AGENT', phase: 'UNDERWRITING', row: 4, col: 1 },
  { id: 'human_decision_node', name: 'Human Decision', type: 'HUMAN_IN_LOOP', phase: 'UNDERWRITING', row: 5, col: 1 },
  { id: 'commitment_node', name: 'Commitment', type: 'AGENT', phase: 'COMMITMENT', row: 6, col: 0 },
  { id: 'denial_node', name: 'Denial', type: 'AGENT', phase: 'DENIAL', row: 6, col: 2 },
  { id: 'closing_node', name: 'Closing', type: 'AGENT', phase: 'CLOSING', row: 7, col: 0 },
  { id: 'maintenance_node', name: 'Maintenance', type: 'AGENT', phase: 'POST_CLOSING', row: 8, col: 0 },
  { id: 'end_loan_closed', name: 'Loan Closed', type: 'END', phase: 'END', row: 9, col: 0 },
  { id: 'end_denied', name: 'Denied', type: 'END', phase: 'END', row: 7, col: 2 },
  { id: 'end_ineligible', name: 'Ineligible', type: 'END', phase: 'END', row: 1, col: 2 },
  { id: 'end_incomplete', name: 'Incomplete', type: 'END', phase: 'END', row: 2, col: 2 },
  { id: 'end_withdrawn', name: 'Withdrawn', type: 'END', phase: 'END', row: 4, col: 2 },
];

const edgeDefinitions = [
  { source: 'intake_node', target: 'application_node', label: 'eligible' },
  { source: 'intake_node', target: 'end_ineligible', label: 'ineligible' },
  { source: 'application_node', target: 'disclosure_node' },
  { source: 'application_node', target: 'end_incomplete', label: 'incomplete' },
  { source: 'disclosure_node', target: 'loan_review_node' },
  { source: 'loan_review_node', target: 'underwriting_node', label: 'docs complete' },
  { source: 'loan_review_node', target: 'end_withdrawn', label: 'withdrawn' },
  { source: 'underwriting_node', target: 'human_decision_node' },
  { source: 'human_decision_node', target: 'commitment_node', label: 'approved' },
  { source: 'human_decision_node', target: 'denial_node', label: 'denied' },
  { source: 'commitment_node', target: 'closing_node' },
  { source: 'denial_node', target: 'end_denied' },
  { source: 'closing_node', target: 'maintenance_node' },
  { source: 'maintenance_node', target: 'end_loan_closed' },
];

function WorkflowGraph({ data, currentNode }) {
  const { nodes: graphNodes, edges: graphEdges } = useMemo(() => {
    const COL_WIDTH = 220;
    const ROW_HEIGHT = 100;
    const START_X = 50;
    const START_Y = 50;

    // Build a map of executed nodes from API data
    const executedNodes = new Map();
    if (data?.nodes) {
      data.nodes.forEach(n => {
        executedNodes.set(n.node_id, {
          status: n.status,
          executionCount: n.execution_count || 0,
        });
      });
    }

    // Create nodes
    const nodes = workflowStructure.map((nodeDef) => {
      const executed = executedNodes.get(nodeDef.id) || { status: 'pending', executionCount: 0 };
      const isActive = nodeDef.id === currentNode ||
                       nodeDef.name.toLowerCase().includes(currentNode?.toLowerCase() || '');

      return {
        id: nodeDef.id,
        type: 'custom',
        position: {
          x: START_X + nodeDef.col * COL_WIDTH,
          y: START_Y + nodeDef.row * ROW_HEIGHT,
        },
        data: {
          label: nodeDef.name,
          type: nodeDef.type,
          phase: nodeDef.phase,
          status: isActive ? 'active' : executed.status,
          isActive,
          executionCount: executed.executionCount,
        },
      };
    });

    // Create edges
    const edges = edgeDefinitions.map((edgeDef, index) => ({
      id: `e-${index}`,
      source: edgeDef.source,
      target: edgeDef.target,
      label: edgeDef.label,
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
      labelBgStyle: { fill: '#1f2937', fillOpacity: 0.8 },
      labelBgPadding: [4, 2],
      animated: edgeDef.source === currentNode,
      style: {
        stroke: edgeDef.source === currentNode ? '#fbbf24' : '#4b5563',
        strokeWidth: edgeDef.source === currentNode ? 3 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeDef.source === currentNode ? '#fbbf24' : '#4b5563',
      },
    }));

    return { nodes, edges };
  }, [data, currentNode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  React.useEffect(() => {
    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [graphNodes, graphEdges, setNodes, setEdges]);

  return (
    <div className="space-y-4">
      <div style={{ height: '700px' }} className="rounded-lg overflow-hidden border border-gray-700">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background color="#374151" gap={20} size={1} />
          <Controls className="bg-gray-800 border border-gray-700 rounded-lg [&>button]:bg-gray-700 [&>button]:border-gray-600 [&>button]:text-white [&>button:hover]:bg-gray-600" />
          <MiniMap
            nodeColor={(node) => nodeColors[node.data?.type] || '#3b82f6'}
            maskColor="rgba(0,0,0,0.8)"
            className="bg-gray-800 border border-gray-700 rounded-lg"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center py-3 bg-gray-800/50 rounded-lg">
        <div className="text-xs text-gray-400 font-medium">Node Types:</div>
        {Object.entries(nodeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-300">{type.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="border-l border-gray-600 mx-2" />
        <div className="text-xs text-gray-400 font-medium">Status:</div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-300 capitalize">{status}</span>
          </div>
        ))}
      </div>

      {/* Phase Progress */}
      {data?.phase_summary && (
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(data.phase_summary).map(([phase, status]) => (
            <div
              key={phase}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                status === 'completed'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : status === 'active'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              {phase.replace('_', ' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkflowGraph;
