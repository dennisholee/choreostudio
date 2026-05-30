import type { TransportProtocol } from '@choreostudio/shared';

interface TransportSelectorProps {
  value: TransportProtocol | undefined;
  onChange: (protocol: TransportProtocol) => void;
  disabled?: boolean;
}

const OPTIONS: { value: TransportProtocol; label: string; description: string }[] = [
  { value: 'REST',  label: 'REST',  description: 'Synchronous HTTP command — OpenAPI contract generated' },
  { value: 'Async', label: 'Async', description: 'Async message — AsyncAPI contract generated' },
];

export function TransportSelector({ value, onChange, disabled = false }: TransportSelectorProps) {
  return (
    <div className="transport-selector" role="radiogroup" aria-label="Transport Protocol">
      {OPTIONS.map(opt => (
        <label
          key={opt.value}
          className={`transport-selector__option${value === opt.value ? ' transport-selector__option--selected' : ''}${disabled ? ' transport-selector__option--disabled' : ''}`}
          title={opt.description}
        >
          <input
            type="radio"
            name="transport"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            aria-label={opt.label}
          />
          <span className="transport-selector__label">{opt.label}</span>
          <span className="transport-selector__desc">{opt.description}</span>
        </label>
      ))}
    </div>
  );
}
