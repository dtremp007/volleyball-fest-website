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
};

export function Counter(input: CounterProps) {
  const handleIncrement = () => {
    const newValue = Math.min(input.value + 1, input.max);
    input.onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(input.value - 1, input.min);
    input.onChange(newValue);
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
          disabled={input.disabled || input.value <= input.min}
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
          disabled={input.disabled || input.value >= input.max}
          tabIndex={-1}
          type="button"
        >
          <Plus />
        </button>
      </div>
    </div>
  );
}
