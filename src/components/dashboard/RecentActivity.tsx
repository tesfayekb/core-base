
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const activities = [
  {
    id: 1,
    user: "Alex",
    action: "created a new project",
    time: "2 hours ago",
  },
  {
    id: 2,
    user: "Sarah",
    action: "updated dashboard settings",
    time: "5 hours ago",
  },
  {
    id: 3,
    user: "Mike",
    action: "added new team members",
    time: "Yesterday",
  },
  {
    id: 4,
    user: "Jessica",
    action: "completed onboarding",
    time: "2 days ago",
  },
];

export function RecentActivity() {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your team's latest actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {activity.user.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.user}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.action}
                </p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
