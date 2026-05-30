import * as Y from 'yjs';

function createCanvasDoc() {
  return new Y.Doc();
}

function getElements(doc) {
  return doc.getMap('elements');
}

function addElement(doc, element) {
  const yElement = new Y.Map();
  doc.transact(() => {
    yElement.set('id', element.id);
    yElement.set('type', element.type);
    yElement.set('name', element.name);
    yElement.set('position', element.position);
    if (element.transport) {
      yElement.set('transport', element.transport);
    }
    getElements(doc).set(element.id, yElement);
  });
}

function syncDocs(docA, docB) {
  const updateA = Y.encodeStateAsUpdate(docA);
  const updateB = Y.encodeStateAsUpdate(docB);
  Y.applyUpdate(docA, updateB);
  Y.applyUpdate(docB, updateA);
}

function benchmarkSingleElementMerge() {
  const docA = createCanvasDoc();
  const docB = createCanvasDoc();

  addElement(docA, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 0, y: 0 } });
  syncDocs(docA, docB);

  const start = performance.now();
  addElement(docA, {
    id: 'cmd-1',
    type: 'command',
    name: 'PlaceOrder',
    position: { x: 100, y: 0 },
    transport: 'REST',
  });
  syncDocs(docA, docB);

  return performance.now() - start;
}

function benchmarkConcurrentAdds() {
  const docA = createCanvasDoc();
  const docB = createCanvasDoc();
  syncDocs(docA, docB);

  const start = performance.now();
  for (let index = 0; index < 50; index += 1) {
    addElement(docA, {
      id: `agg-${index}`,
      type: 'aggregate',
      name: `Aggregate${index}`,
      position: { x: index * 10, y: 0 },
    });
    addElement(docB, {
      id: `cmd-${index}`,
      type: 'command',
      name: `Command${index}`,
      position: { x: index * 10, y: 100 },
      transport: 'REST',
    });
  }
  syncDocs(docA, docB);

  return performance.now() - start;
}

const singleMerge = benchmarkSingleElementMerge();
const concurrentAdds = benchmarkConcurrentAdds();
const decision =
  singleMerge < 100 && concurrentAdds < 200 ? 'GO' : singleMerge <= 200 && concurrentAdds <= 200 ? 'CONDITIONAL GO' : 'NO-GO';

console.log(`Single-element merge latency: ${singleMerge.toFixed(2)}ms`);
console.log(`100 concurrent adds + sync: ${concurrentAdds.toFixed(2)}ms`);
console.log(`Decision: ${decision}`);
