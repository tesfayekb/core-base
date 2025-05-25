
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>This page is under development</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">User list will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
