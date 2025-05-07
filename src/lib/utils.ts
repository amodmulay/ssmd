import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export type DataSourceType = "api" | "yahoo";

const DATA_SOURCE_KEY = "preferredDataSource";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function logError(error: unknown, context?: string) {
  if (context) {
    console.error(`Error in ${context}:`, error);
  } else console.error(error);
}

export function useDataSource() {
  const getPreferredDataSource = (): DataSourceType => {
    if (typeof localStorage !== "undefined") {
      const storedDataSource = localStorage.getItem(DATA_SOURCE_KEY);
      return storedDataSource === "yahoo" ? "yahoo" : "api";
    }
    return "api";
  };

  const setPreferredDataSource = (dataSource: DataSourceType) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DATA_SOURCE_KEY, dataSource);
    }
  };

  const toggleDataSource = () => {
    const currentDataSource = getPreferredDataSource();
    const newDataSource = currentDataSource === "api" ? "yahoo" : "api";
    setPreferredDataSource(newDataSource);
    return newDataSource;
  };
  return { getPreferredDataSource, setPreferredDataSource, toggleDataSource };
}
