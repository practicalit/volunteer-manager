"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

interface SelectItemData {
  value: string;
  label: string;
}

// Simple native-style select wrapper for forms
export function Select({ value, onValueChange, placeholder, disabled, children, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SelectItemData[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Parse children to get options
  useEffect(() => {
    const parsed: SelectItemData[] = [];
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach((child: unknown) => {
      if (child && typeof child === "object" && "props" in (child as object)) {
        const c = child as { props: { value: string; children: React.ReactNode } };
        if (c.props?.value) {
          parsed.push({ value: c.props.value, label: String(c.props.children) });
        }
      }
    });
    setItems(parsed);
  }, [children]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = items.find((i) => i.value === value)?.label;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className={cn(!selectedLabel && "text-gray-400")}>
          {selectedLabel || placeholder || "Select..."}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <div
              key={item.value}
              className="flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                onValueChange?.(item.value);
                setOpen(false);
              }}
            >
              {item.value === value && <Check className="mr-2 h-4 w-4 text-indigo-600" />}
              <span className={item.value !== value ? "ml-6" : ""}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <div data-value={value}>{children}</div>;
}
