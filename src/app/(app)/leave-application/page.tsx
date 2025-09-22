
"use client";

import PageHeader from '@/components/shared/page-header';
import LeaveForm from '@/components/leave-application/leave-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { StoredLeaveApplicationDB, UserRole } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getLeaveRequestsAction } from '@/actions/leaveActions';
import { format, parseISO } from 'date-fns';
import { History, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';

export default function LeaveApplicationPage() {
  const { toast } = useToast();
  const [leaveHistory, setLeaveHistory] = useState<StoredLeaveApplicationDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false); // For dialog control

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    const currentUserId = localStorage.getItem('currentUserId');
    const currentUserRole = localStorage.getItem('currentUserRole') as UserRole | null;
    const currentSchoolId = localStorage.getItem('currentSchoolId');

    if (!currentUserId || !currentUserRole || !currentSchoolId) {
      toast({ title: "Error", description: "User context is missing. Please log in again.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const result = await getLeaveRequestsAction({
      school_id: currentSchoolId,
      applicant_user_id: currentUserId,
      target_role: currentUserRole as 'student' | 'teacher' | 'accountant',
    });

    if (result.ok) {
      setLeaveHistory(result.applications || []);
    } else {
      toast({ title: "Error", description: result.message || "Failed to load leave history.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  
  const handleDialogClose = () => {
    setIsFormOpen(false);
    fetchHistory(); // Re-fetch history after submission
  };

  const formatDateSafe = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
        const date = parseISO(dateString);
        return format(date, 'PP');
    } catch {
        return 'Invalid Date';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Application"
        description="Submit your leave request and view the history of your past applications."
      />
      <div className="space-y-6">
        <LeaveForm />
        
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" />My Leave History</CardTitle>
              <CardDescription>A log of all your submitted leave requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin mr-2"/>Loading your leave history...</div>
              ) : leaveHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">You have not submitted any leave requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveHistory.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{formatDateSafe(req.start_date)}</TableCell>
                        <TableCell>{formatDateSafe(req.end_date)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={req.reason}>{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'Approved' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'}>
                            {req.status === 'Approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                            {req.status === 'Rejected' && <XCircle className="mr-1 h-3 w-3" />}
                            {req.status === 'Pending' && <Clock className="mr-1 h-3 w-3" />}
                            {req.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
