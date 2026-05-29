import { create } from 'zustand';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import {
  ELEMENT_COLORS,
  validateStructure,
  type CanvasDocument,
  type Connection,
  type ElementType,
  type StructuralViolation,
  type TransportProtocol,
} from '@choreostudio/shared';
import { checkPastTense } from '../utils/past-tense-checker';

export interface CanvasNodeData {
  label: string;
  elementType: ElementType;
  color: string;
  transport?: TransportProtocol;
  warningMessage?: string;
}

interface ValidationState {
  structural: StructuralViolation[];
  semantic: string[];
}

interface CanvasState {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  canvasDoc: CanvasDocument | null;
  addElement: (type: ElementType, position: { x: number; y: number }) => void;
  updateElementLabel: (id: string, label: string) => void;
  updateElementPosition: (id: string, position: { x: number; y: number }) => void;
  removeElement: (id: string) => void;
  addConnection: (source: string, target: string) => void;
  removeConnection: (id: string) => void;
  applyNodeChanges: (changes: NodeChange[]) => void;
  applyEdgeChanges: (changes: EdgeChange[]) => void;
  commitCanvas: () => boolean;
  getValidationState: () => ValidationState;
}

const DEFAULT_LABELS: Record<ElementType, string> = {
  domainEvent: 'EventCreated',
  command: 'SendCommand',
  policy: 'Policy',
  aggregate: 'Aggregate',
  readModel: 'ReadModel',
};

const DEFAULT_DOCUMENT_META = {
  id: 'semantic-canvas',
  slug: 'semantic-canvas',
  name: 'Semantic Canvas',
  workspaceId: 'local-workspace',
  teamId: 'local-team',
  orgId: 'local-org',
} as const;

function formatViolation(violation: StructuralViolation): StructuralViolation {
  if (violation.message.includes('must be connected to an Aggregate or Policy')) {
    return {
      ...violation,
      message: 'Command must connect to Aggregate or Orchestrator',
    };
  }

  return violation;
}

function createNode(type: ElementType, position: { x: number; y: number }): Node<CanvasNodeData> {
  const color = ELEMENT_COLORS[type];
  const transport = type === 'command' ? 'REST' : undefined;

  return {
    id: uuidv4(),
    type,
    position,
    data: {
      label: DEFAULT_LABELS[type],
      elementType: type,
      color,
      ...(transport ? { transport } : {}),
    },
    style: {
      backgroundColor: color,
    },
  };
}

function toCanvasDocument(nodes: Node<CanvasNodeData>[], edges: Edge[], currentDoc: CanvasDocument | null): CanvasDocument {
  const now = new Date().toISOString();

  return {
    schemaVersion: '0.1.0',
    id: currentDoc?.id ?? DEFAULT_DOCUMENT_META.id,
    slug: currentDoc?.slug ?? DEFAULT_DOCUMENT_META.slug,
    name: currentDoc?.name ?? DEFAULT_DOCUMENT_META.name,
    workspaceId: currentDoc?.workspaceId ?? DEFAULT_DOCUMENT_META.workspaceId,
    teamId: currentDoc?.teamId ?? DEFAULT_DOCUMENT_META.teamId,
    orgId: currentDoc?.orgId ?? DEFAULT_DOCUMENT_META.orgId,
    lifecycleState: currentDoc?.lifecycleState ?? 'draft',
    createdAt: currentDoc?.createdAt ?? now,
    updatedAt: now,
    elements: nodes.map((node) => {
      const semanticCheck =
        node.data.elementType === 'domainEvent' ? checkPastTense(node.data.label) : { valid: true, message: '' };

      return {
        id: node.id,
        type: node.data.elementType,
        name: node.data.label,
        ...(node.data.transport ? { transport: node.data.transport } : {}),
        position: node.position,
        style: { color: node.data.color },
        validationState: {
          structural: 'valid',
          semantic: semanticCheck.valid ? 'valid' : 'warning',
          messages: semanticCheck.message ? [semanticCheck.message] : [],
        },
      };
    }),
    connections: edges.map<Connection>((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      direction: 'sourceToTarget',
      ...(edge.label ? { label: String(edge.label) } : {}),
    })),
    serviceBoundaries: currentDoc?.serviceBoundaries ?? [],
    annotations: currentDoc?.annotations ?? [],
  };
}

function withSemanticWarnings(nodes: Node<CanvasNodeData>[], edges: Edge[], currentDoc: CanvasDocument | null): Node<CanvasNodeData>[] {
  const doc = toCanvasDocument(nodes, edges, currentDoc);
  const warningMap = new Map<string, string>();

  for (const element of doc.elements) {
    if (element.type !== 'domainEvent') {
      continue;
    }

    const result = checkPastTense(element.name);
    if (!result.valid) {
      warningMap.set(element.id, result.message);
    }
  }

  return nodes.map((node) => {
    const { warningMessage: _warningMessage, ...restData } = node.data;
    const warningMessage = warningMap.get(node.id);

    return {
      ...node,
      data: warningMessage ? { ...restData, warningMessage } : restData,
    };
  });
}

function getValidationState(nodes: Node<CanvasNodeData>[], edges: Edge[], currentDoc: CanvasDocument | null): ValidationState {
  const doc = toCanvasDocument(nodes, edges, currentDoc);
  const structural = validateStructure(doc).map(formatViolation);
  const semantic = doc.elements
    .filter((element) => element.type === 'domainEvent')
    .map((element) => checkPastTense(element.name).message)
    .filter((message): message is string => Boolean(message));

  return { structural, semantic };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  canvasDoc: null,
  addElement: (type, position) => {
    set((state) => {
      const nodes = withSemanticWarnings([...state.nodes, createNode(type, position)], state.edges, state.canvasDoc);
      return { ...state, nodes };
    });
  },
  updateElementLabel: (id, label) => {
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label,
              },
            }
          : node,
      );

      return { ...state, nodes: withSemanticWarnings(nodes, state.edges, state.canvasDoc) };
    });
  },
  updateElementPosition: (id, position) => {
    set((state) => ({
      ...state,
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, position } : node)),
    }));
  },
  removeElement: (id) => {
    set((state) => {
      const nodes = state.nodes.filter((node) => node.id !== id);
      const edges = state.edges.filter((edge) => edge.source !== id && edge.target !== id);
      return { ...state, nodes: withSemanticWarnings(nodes, edges, state.canvasDoc), edges };
    });
  },
  addConnection: (source, target) => {
    set((state) => {
      const alreadyExists = state.edges.some((edge) => edge.source === source && edge.target === target);
      if (alreadyExists) {
        return state;
      }

      const edges = [
        ...state.edges,
        {
          id: uuidv4(),
          source,
          target,
          type: 'smoothstep',
        },
      ];

      return { ...state, edges, nodes: withSemanticWarnings(state.nodes, edges, state.canvasDoc) };
    });
  },
  removeConnection: (id) => {
    set((state) => {
      const edges = state.edges.filter((edge) => edge.id !== id);
      return { ...state, edges, nodes: withSemanticWarnings(state.nodes, edges, state.canvasDoc) };
    });
  },
  applyNodeChanges: (changes) => {
    set((state) => {
      const removedIds = new Set(changes.filter((change) => change.type === 'remove').map((change) => change.id));
      const nodes = applyNodeChanges(changes, state.nodes);
      const edges = removedIds.size
        ? state.edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target))
        : state.edges;

      return { ...state, nodes: withSemanticWarnings(nodes, edges, state.canvasDoc), edges };
    });
  },
  applyEdgeChanges: (changes) => {
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      return { ...state, edges, nodes: withSemanticWarnings(state.nodes, edges, state.canvasDoc) };
    });
  },
  commitCanvas: () => {
    const state = get();
    const validation = getValidationState(state.nodes, state.edges, state.canvasDoc);

    if (validation.structural.length > 0) {
      return false;
    }

    set({ canvasDoc: toCanvasDocument(state.nodes, state.edges, state.canvasDoc) });
    return true;
  },
  getValidationState: () => {
    const state = get();
    return getValidationState(state.nodes, state.edges, state.canvasDoc);
  },
}));
