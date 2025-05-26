
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  History, 
  Search, 
  Filter,
  User,
  Shield,
  Settings,
  AlertTriangle,
  Clock,
  MapPin
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  action: string;
  userId: string;
  userName?: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'error';
}

interface UserAuditTrailProps {
  userId?: string;
  tenantId: string;
}

export function UserAuditTrail({ userId, tenantId }: UserAuditTrailProps) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('7d');

  // Mock audit events - in production, this would come from the audit service
  useEffect(() => {
    const mockEvents: AuditEvent[] = [
      {
        id: 'audit-001',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        eventType: 'authentication',
        action: 'login',
        userId: userId || 'user-123',
        userName: 'John Doe',
        details: { method: 'password', success: true },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        severity: 'low',
        outcome: 'success'
      },
      {
        id: 'audit-002',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        eventType: 'authorization',
        action: 'role_assignment',
        userId: userId || 'user-123',
        userName: 'John Doe',
        resourceType: 'role',
        resourceId: 'manager-role',
        details: { 
          previousRole: 'user', 
          newRole: 'manager',
          assignedBy: 'admin-user'
        },
        ipAddress: '192.168.1.100',
        severity: 'medium',
        outcome: 'success'
      },
      {
        id: 'audit-003',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        eventType: 'data_access',
        action: 'user_profile_update',
        userId: userId || 'user-123',
        userName: 'John Doe',
        resourceType: 'user_profile',
        resourceId: userId || 'user-123',
        details: { 
          fieldsChanged: ['email', 'phone'],
          oldValues: { email: 'old@example.com' },
          newValues: { email: 'new@example.com' }
        },
        severity: 'low',
        outcome: 'success'
      },
      {
        id: 'audit-004',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        eventType: 'security_event',
        action: 'failed_permission_check',
        userId: userId || 'user-123',
        userName: 'John Doe',
        resourceType: 'admin_panel',
        details: { 
          attemptedAction: 'access_admin_panel',
          requiredPermission: 'admin_access',
          reason: 'insufficient_permissions'
        },
        ipAddress: '192.168.1.100',
        severity: 'medium',
        outcome: 'failure'
      }
    ];

    setAuditEvents(mockEvents);
    setFilteredEvents(mockEvents);
  }, [userId]);

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = auditEvents.filter(event => {
      const matchesSearch = searchTerm === '' || 
        event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.userName && event.userName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEventType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;
      const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;

      // Time range filter
      const eventTime = new Date(event.timestamp);
      const now = new Date();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      const timeRange = timeRanges[timeRangeFilter as keyof typeof timeRanges] || timeRanges['7d'];
      const matchesTimeRange = timeRangeFilter === 'all' || (now.getTime() - eventTime.getTime()) <= timeRange;

      return matchesSearch && matchesEventType && matchesSeverity && matchesTimeRange;
    });

    setFilteredEvents(filtered);
  }, [auditEvents, searchTerm, eventTypeFilter, severityFilter, timeRangeFilter]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'authentication':
        return <User className="h-4 w-4" />;
      case 'authorization':
        return <Shield className="h-4 w-4" />;
      case 'data_access':
        return <Settings className="h-4 w-4" />;
      case 'security_event':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      critical: 'destructive'
    } as const;

    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant={variants[severity as keyof typeof variants]} className={colors[severity as keyof typeof colors]}>
        {severity}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    const variants = {
      success: 'default',
      failure: 'destructive',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[outcome as keyof typeof variants] || 'secondary'}>
        {outcome}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>User Audit Trail</span>
            <Badge variant="outline">{filteredEvents.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="authorization">Authorization</SelectItem>
                <SelectItem value="data_access">Data Access</SelectItem>
                <SelectItem value="security_event">Security Event</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Events */}
      <Card>
        <CardContent className="pt-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || eventTypeFilter !== 'all' || severityFilter !== 'all' 
                  ? 'No events found matching your filters' 
                  : 'No audit events found'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getEventIcon(event.eventType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{event.action.replace('_', ' ').toUpperCase()}</h4>
                          {getSeverityBadge(event.severity)}
                          {getOutcomeBadge(event.outcome)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(event.timestamp).toLocaleString()}</span>
                            </div>
                            {event.ipAddress && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{event.ipAddress}</span>
                              </div>
                            )}
                          </div>
                          
                          {event.userName && (
                            <div>User: {event.userName}</div>
                          )}
                          
                          {event.resourceType && (
                            <div>Resource: {event.resourceType} {event.resourceId && `(${event.resourceId})`}</div>
                          )}
                        </div>
                        
                        {Object.keys(event.details).length > 0 && (
                          <div className="mt-2 text-xs bg-muted rounded p-2">
                            <div className="font-medium mb-1">Details:</div>
                            <pre className="whitespace-pre-wrap text-xs">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
