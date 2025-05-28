
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, 
  X, 
  Mail, 
  UserX, 
  UserCheck, 
  Download, 
  ChevronDown,
  Shield,
  Trash
} from 'lucide-react';

interface UserDirectoryBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function UserDirectoryBulkActions({
  selectedCount,
  onClearSelection,
}: UserDirectoryBulkActionsProps) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-blue-600 hover:text-blue-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            
            <Button variant="outline" size="sm" className="text-green-600 border-green-200">
              <UserCheck className="h-4 w-4 mr-2" />
              Activate
            </Button>
            
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-200">
              <UserX className="h-4 w-4 mr-2" />
              Suspend
            </Button>
            
            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Shield className="h-4 w-4 mr-2" />
                  Assign Role
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Reset Passwords
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Users
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
