import { Canvas } from './components/Canvas';
import { ElementPalette } from './components/ElementPalette';
import 'reactflow/dist/style.css';

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <ElementPalette />
      <div style={{ flex: 1 }}>
        <Canvas />
      </div>
    </div>
  );
}
