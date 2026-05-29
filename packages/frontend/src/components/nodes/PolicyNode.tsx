import type { NodeProps } from 'reactflow';
import type { CanvasNodeData } from '../../store/canvas-store';
import { BaseNode } from './BaseNode';

export function PolicyNode(props: NodeProps<CanvasNodeData>) {
  return <BaseNode {...props} subtitle="Policy/Saga" />;
}
