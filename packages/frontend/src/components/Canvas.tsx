import { useCallback, useEffect, useMemo, useState, type DragEvent, type MouseEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Connection,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import type { ElementType } from '@choreostudio/shared';
import { AggregateNode } from './nodes/AggregateNode';
import { CommandNode } from './nodes/CommandNode';
import { DomainEventNode } from './nodes/DomainEventNode';
import { PolicyNode } from './nodes/PolicyNode';
import { ReadModelNode } from './nodes/ReadModelNode';
import { useCanvasStore, type CanvasNodeData } from '../store/canvas-store';

const nodeTypes: NodeTypes = {
  domainEvent: DomainEventNode,
  command: CommandNode,
  policy: PolicyNode,
  aggregate: AggregateNode,
  readModel: ReadModelNode,
};

function CanvasInner() {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const addElement = useCanvasStore((state) => state.addElement);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const updateElementPosition = useCanvasStore((state) => state.updateElementPosition);
  const applyNodeChanges = useCanvasStore((state) => state.applyNodeChanges);
  const applyEdgeChanges = useCanvasStore((state) => state.applyEdgeChanges);
  const commitCanvas = useCanvasStore((state) => state.commitCanvas);
  const getValidationState = useCanvasStore((state) => state.getValidationState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const validationState = useMemo(() => getValidationState(), [getValidationState, nodes, edges]);

  const runCommitValidation = useCallback(() => {
    const committed = commitCanvas();
    const latestValidation = useCanvasStore.getState().getValidationState();

    if (!committed && latestValidation.structural.length > 0) {
      setToastMessage(`Structural validation failed: ${latestValidation.structural[0].message}`);
      return;
    }

    setToastMessage(null);
  }, [commitCanvas]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as ElementType;
      if (!type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addElement(type, position);
      window.requestAnimationFrame(runCommitValidation);
    },
    [addElement, reactFlowInstance, runCommitValidation],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      addConnection(connection.source, connection.target);
      window.requestAnimationFrame(runCommitValidation);
    },
    [addConnection, runCommitValidation],
  );

  const handleConnectEnd = useCallback(() => {
    window.requestAnimationFrame(runCommitValidation);
  }, [runCommitValidation]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      applyNodeChanges(changes);
      if (changes.some((change) => change.type === 'remove')) {
        window.requestAnimationFrame(runCommitValidation);
      }
    },
    [applyNodeChanges, runCommitValidation],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removedIds = changes.filter((change) => change.type === 'remove').map((change) => change.id);
      applyEdgeChanges(changes);
      if (removedIds.length > 0) {
        window.requestAnimationFrame(runCommitValidation);
      }
    },
    [applyEdgeChanges, runCommitValidation],
  );

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent, node: Node<CanvasNodeData>) => {
      updateElementPosition(node.id, node.position);
      runCommitValidation();
    },
    [runCommitValidation, updateElementPosition],
  );

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {validationState.semantic.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 20,
            maxWidth: 440,
            borderRadius: 10,
            border: '1px solid #f59e0b',
            background: '#fffbeb',
            padding: '10px 12px',
            color: '#92400e',
          }}
        >
          <strong>Semantic warnings</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {validationState.semantic.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {validationState.structural.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: validationState.semantic.length > 0 ? 128 : 16,
            left: 16,
            zIndex: 20,
            maxWidth: 440,
            borderRadius: 10,
            border: '1px solid #dc2626',
            background: '#fef2f2',
            padding: '10px 12px',
            color: '#991b1b',
          }}
        >
          <strong>Structural validation failed</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {validationState.structural.map((violation) => (
              <li key={`${violation.elementId}:${violation.message}`}>{violation.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {toastMessage ? (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 30,
            borderRadius: 10,
            background: '#991b1b',
            color: '#fff',
            padding: '10px 14px',
            boxShadow: '0 10px 20px rgba(127, 29, 29, 0.25)',
          }}
        >
          {toastMessage}
        </div>
      ) : null}
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
