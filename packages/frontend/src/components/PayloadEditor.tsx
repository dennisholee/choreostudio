import { useState, useCallback } from 'react';

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

interface PayloadEditorProps {
  schema: JsonSchema | null | undefined;
  onChange: (schema: JsonSchema) => void;
  readOnly?: boolean;
}

function PropertyRow({
  name,
  schema,
  required,
  onUpdate,
  onRemove,
  onToggleRequired,
}: {
  name: string;
  schema: JsonSchema;
  required: boolean;
  onUpdate: (name: string, schema: JsonSchema) => void;
  onRemove: (name: string) => void;
  onToggleRequired: (name: string) => void;
}) {
  return (
    <div className="payload-property-row">
      <input
        className="payload-prop-name"
        value={name}
        readOnly
        title="Property name"
      />
      <select
        className="payload-prop-type"
        value={schema.type ?? 'string'}
        onChange={e => onUpdate(name, { ...schema, type: e.target.value })}
        aria-label={`Type for ${name}`}
      >
        {['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'].map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input
        className="payload-prop-desc"
        placeholder="Description"
        value={schema.description ?? ''}
        onChange={e => onUpdate(name, { ...schema, description: e.target.value })}
        aria-label={`Description for ${name}`}
      />
      <label className="payload-prop-required" title="Required">
        <input
          type="checkbox"
          checked={required}
          onChange={() => onToggleRequired(name)}
          aria-label={`Required: ${name}`}
        />
        <span>req</span>
      </label>
      <button className="payload-prop-remove" onClick={() => onRemove(name)} aria-label={`Remove ${name}`}>
        ×
      </button>
    </div>
  );
}

export function PayloadEditor({ schema, onChange, readOnly = false }: PayloadEditorProps) {
  const [newPropName, setNewPropName] = useState('');
  const current: JsonSchema = schema ?? { type: 'object', properties: {}, required: [] };
  const properties: Record<string, JsonSchema> = (current.properties as Record<string, JsonSchema>) ?? {};
  const required: string[] = (current.required as string[]) ?? [];

  const updateProperty = useCallback(
    (name: string, propSchema: JsonSchema) => {
      onChange({ ...current, properties: { ...properties, [name]: propSchema } });
    },
    [current, properties, onChange],
  );

  const removeProperty = useCallback(
    (name: string) => {
      const { [name]: _, ...rest } = properties;
      onChange({ ...current, properties: rest, required: required.filter(r => r !== name) });
    },
    [current, properties, required, onChange],
  );

  const toggleRequired = useCallback(
    (name: string) => {
      const next = required.includes(name) ? required.filter(r => r !== name) : [...required, name];
      onChange({ ...current, required: next });
    },
    [current, required, onChange],
  );

  const addProperty = useCallback(() => {
    const name = newPropName.trim();
    if (!name || properties[name]) return;
    onChange({ ...current, properties: { ...properties, [name]: { type: 'string' } } });
    setNewPropName('');
  }, [current, properties, newPropName, onChange]);

  if (readOnly) {
    return (
      <div className="payload-editor payload-editor--readonly">
        <pre>{JSON.stringify(current, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="payload-editor" role="group" aria-label="Payload Schema Editor">
      <div className="payload-editor__header">
        <span className="payload-editor__label">Payload Schema</span>
        <span className="payload-editor__type-badge">object</span>
      </div>
      <div className="payload-editor__properties">
        {Object.entries(properties).map(([name, propSchema]) => (
          <PropertyRow
            key={name}
            name={name}
            schema={propSchema}
            required={required.includes(name)}
            onUpdate={updateProperty}
            onRemove={removeProperty}
            onToggleRequired={toggleRequired}
          />
        ))}
      </div>
      <div className="payload-editor__add-row">
        <input
          className="payload-editor__new-prop-input"
          placeholder="New property name"
          value={newPropName}
          onChange={e => setNewPropName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addProperty(); }}
          aria-label="New property name"
        />
        <button className="payload-editor__add-btn" onClick={addProperty} aria-label="Add property">
          + Add property
        </button>
      </div>
    </div>
  );
}
