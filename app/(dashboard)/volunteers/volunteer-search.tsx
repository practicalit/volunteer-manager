"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface VolunteerSearchProps {
  defaultValue?: string;
}

export function VolunteerSearch({ defaultValue = "" }: VolunteerSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams();
    if (term) params.set("search", term);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        placeholder="Search by name, phone, or email..."
        className="pl-9"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          handleSearch(e.target.value);
        }}
      />
    </div>
  );
}
