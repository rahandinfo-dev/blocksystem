import type { ComponentProps } from "react";

/**
 * Shared native select primitive. Native controls preserve keyboard, touch,
 * and browser accessibility behavior while the `app-select` class supplies
 * the application-wide visual treatment.
 */
export function AppSelect({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`app-select form-select ${className}`.trim()} />;
}
