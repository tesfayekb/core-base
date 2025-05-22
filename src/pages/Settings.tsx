
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Settings Overview</CardTitle>
          <CardDescription>This page is under development</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Settings options will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
