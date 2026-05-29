import type { NodeProps } from 'reactflow';
import type { CanvasNodeData } from '../../store/canvas-store';
import { BaseNode } from './BaseNode';

export function ReadModelNode(props: NodeProps<CanvasNodeData>) {
  return <BaseNode {...props} subtitle="Read Model" />;
}
