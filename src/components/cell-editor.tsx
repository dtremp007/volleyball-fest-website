import React from "react";

export function CellEditor({ value: initialValue }: React.ComponentProps<"input">) {
  const [value, setValue] = React.useState(initialValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <form
      method="post"
      className="focus-within:ring-opacity-50 flex h-[57px] items-center justify-end pr-2 focus-within:ring-2 focus-within:ring-blue-500"
      onSubmit={(e) => {
        e.preventDefault();
        inputRef.current?.blur();
        // go up node tree until you hit a row element
        const nextRow = e.currentTarget.closest("tr")
          ?.nextElementSibling as HTMLTableRowElement;
        if (nextRow) {
          (nextRow.querySelector('input[name="name"]') as HTMLInputElement)?.focus();
        }
      }}
    >
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        name="name"
        value={value}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue(initialValue);
            e.currentTarget.blur();
          }
        }}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 border-none bg-transparent text-right text-base outline-none"
      />
    </form>
  );
}
