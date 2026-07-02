"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { classNames } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="border border-border rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
          >
            {item.question}
            <ChevronDown
              className={classNames(
                "w-4 h-4 text-text-tertiary transition-transform duration-200",
                openIndex === i && "rotate-180"
              )}
            />
          </button>
          <div
            className={classNames(
              "px-5 overflow-hidden transition-all duration-200",
              openIndex === i ? "pb-4 max-h-96" : "max-h-0 pb-0"
            )}
          >
            <p className="text-sm text-text-secondary leading-relaxed">
              {item.answer}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
