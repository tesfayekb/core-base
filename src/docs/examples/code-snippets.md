
# Code Snippets

This file contains example code snippets that demonstrate common patterns used in this project.

## Creating a New Page Component

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Page Title</h2>
        <p className="text-muted-foreground">Page description here</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Card content goes here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Data Fetching with Tanstack Query

```tsx
import { useQuery } from "@tanstack/react-query";

// Fetch function
const fetchData = async () => {
  const response = await fetch("/api/endpoint");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

// In component
function DataComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["unique-key"],
    queryFn: fetchData,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading data</p>;

  return <div>{/* Render data */}</div>;
}
```

## Using Context for State Management

```tsx
// Context file
import { createContext, useContext, useState, ReactNode } from "react";

interface MyContextType {
  value: string;
  setValue: (value: string) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export function MyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState("");
  
  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
}

export function useMyContext() {
  const context = useContext(MyContext);
  if (context === undefined) {
    throw new Error("useMyContext must be used within a MyProvider");
  }
  return context;
}
```
