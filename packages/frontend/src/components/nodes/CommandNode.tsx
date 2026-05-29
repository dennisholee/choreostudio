import type { NodeProps } from 'reactflow';
import type { CanvasNodeData } from '../../store/canvas-store';
import { BaseNode } from './BaseNode';

export function CommandNode(props: NodeProps<CanvasNodeData>) {
  return <BaseNode {...props} subtitle="Command" badge={props.data.transport} />;
}
