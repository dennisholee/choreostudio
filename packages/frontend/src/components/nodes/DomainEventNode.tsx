import type { NodeProps } from 'reactflow';
import type { CanvasNodeData } from '../../store/canvas-store';
import { BaseNode } from './BaseNode';

export function DomainEventNode(props: NodeProps<CanvasNodeData>) {
  return <BaseNode {...props} subtitle="Domain Event" />;
}
