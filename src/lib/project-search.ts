import type { SavedProject } from "@/features/calculator/types";

/** Searches the project details available in the concise project list. */
export function matchesProjectSearch(project: SavedProject, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  const { projectNumber, ownerName } = project.data.metadata;
  return `${project.name} ${projectNumber} ${ownerName}`
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}
