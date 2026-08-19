import { Minus, Plus } from "lucide-react";

type CounterProps = {
  id: string;
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
  min: number;
  disabled?: boolean;
  getNext?: (current: number) => number;
  getPrev?: (current: number) => number;
};

export function Counter(input: CounterProps) {
  const nextValue = input.getNext
    ? input.getNext(input.value)
    : Math.min(input.value + 1, input.max);
  const prevValue = input.getPrev
    ? input.getPrev(input.value)
    : Math.max(input.value - 1, input.min);

  const handleIncrement = () => {
    input.onChange(nextValue);
  };

  const handleDecrement = () => {
    input.onChange(prevValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = +(e.target.value || 0);
    const clampedValue = Math.max(input.min, Math.min(input.max, numValue));
    input.onChange(clampedValue);
  };

  return (
    <div className="flex items-center justify-between border-b pb-2">
      <label htmlFor={input.id} className="">
        {input.label}
      </label>
      <div className="flex items-center space-x-2">
        <button
          className="border-border rounded-full border p-2 active:translate-y-px disabled:opacity-50"
          onClick={handleDecrement}
          disabled={input.disabled || prevValue === input.value}
          tabIndex={-1}
          type="button"
        >
          <Minus />
        </button>
        <input
          id={input.id}
          type="text"
          inputMode="numeric"
          name={input.name}
          value={input.value}
          onChange={handleInputChange}
          disabled={input.disabled}
          className="bg-background w-16 border-none text-center text-lg font-bold focus:ring-0 focus:outline-none disabled:opacity-50"
          max={input.max}
          min={input.min}
        />
        <button
          className="border-border rounded-full border p-2 active:translate-y-px disabled:opacity-50"
          onClick={handleIncrement}
          disabled={input.disabled || nextValue === input.value}
          tabIndex={-1}
          type="button"
        >
          <Plus />
        </button>
      </div>
    </div>
  );
}
