
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FeeTypeGroup } from '@/types';
import { Loader2, Search, ArrowLeft, Download, Group, DollarSign } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getGroupWiseFeesReportInitialData, getGroupWiseFeesReportDataAction } from './actions';
import Link from 'next/link';

interface GroupReportRow {
    student_id: string;
    student_name: string;
    roll_number?: string | null;
    total_assigned: number;
    total_paid: number;
    total_due: number;
}

export default function GroupWiseFeesReportPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<GroupReportRow[]>([]);
    const [feeGroups, setFeeGroups] = useState<FeeTypeGroup[]>([]);
    const [selectedFeeGroupId, setSelectedFeeGroupId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingInitial, setIsFetchingInitial] = useState(true);

    const overallTotals = useMemo(() => {
        return reportData.reduce((acc, item) => {
            acc.assigned += item.total_assigned;
            acc.paid += item.total_paid;
            acc.due += item.total_due;
            return acc;
        }, { assigned: 0, paid: 0, due: 0 });
    }, [reportData]);

    const loadInitialData = useCallback(async () => {
        setIsFetchingInitial(true);
        const adminUserId = localStorage.getItem('currentUserId');
        if (!adminUserId) {
            toast({ title: "Error", description: "Context not found.", variant: "destructive" });
            setIsFetchingInitial(false);
            return;
        }

        const result = await getGroupWiseFeesReportInitialData(adminUserId);
        if (result.ok) {
            setFeeGroups(result.feeGroups || []);
            if ((result.feeGroups || []).length > 0) {
                setSelectedFeeGroupId(result.feeGroups![0].id);
            }
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsFetchingInitial(false);
    }, [toast]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleSearch = useCallback(async () => {
        if (!selectedFeeGroupId) {
            toast({ title: "Please select a fee group", variant: "destructive" });
            return;
        }
        const adminUserId = localStorage.getItem('currentUserId');
        if (!adminUserId) {
            toast({ title: "Error", description: "Context not found.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        
        const result = await getGroupWiseFeesReportDataAction({ adminUserId, feeGroupId: selectedFeeGroupId });
        if (result.ok) {
            setReportData(result.reportData || []);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
            setReportData([]);
        }
        setIsLoading(false);
    }, [selectedFeeGroupId, toast]);
    
    // Auto-fetch data when a fee group is selected for the first time or changed.
    useEffect(() => {
        if(selectedFeeGroupId) {
            handleSearch();
        }
    }, [selectedFeeGroupId, handleSearch]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader 
                title="Group Wise Fees Report"
                description="View a report of all fees assigned to students based on a selected fee group."
                actions={<Button variant="outline" asChild><Link href="/admin/fees-management"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Fee Reports</Link></Button>}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>Select Fee Group</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <Select value={selectedFeeGroupId} onValueChange={setSelectedFeeGroupId} disabled={isFetchingInitial}>
                        <SelectTrigger className="w-full sm:w-[300px]"><SelectValue placeholder="Select a fee group"/></SelectTrigger>
                        <SelectContent>{feeGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>
            
            {isLoading && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>}

            {!isLoading && selectedFeeGroupId && (
                <>
                <Card>
                    <CardHeader><CardTitle>Overall Summary for Group: {feeGroups.find(f=>f.id === selectedFeeGroupId)?.name}</CardTitle></CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-300">Total Assigned</p>
                            <p className="text-2xl font-bold font-mono">₹{overallTotals.assigned.toFixed(2)}</p>
                        </div>
                         <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-300">Total Collected</p>
                            <p className="text-2xl font-bold font-mono">₹{overallTotals.paid.toFixed(2)}</p>
                        </div>
                         <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-300">Total Due</p>
                            <p className="text-2xl font-bold font-mono">₹{overallTotals.due.toFixed(2)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Fee Breakdown by Student</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Roll No.</TableHead>
                                    <TableHead className="text-right">Total Assigned</TableHead>
                                    <TableHead className="text-right">Total Paid</TableHead>
                                    <TableHead className="text-right">Total Due</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {reportData.map(d => (
                                        <TableRow key={d.student_id}>
                                            <TableCell className="font-medium">{d.student_name}</TableCell>
                                            <TableCell>{d.roll_number || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.total_assigned.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.total_paid.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono text-destructive">₹{d.total_due.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : <p className="text-center text-muted-foreground">No students have been assigned this fee group yet.</p>}
                    </CardContent>
                </Card>
                </>
            )}

            {!isLoading && !selectedFeeGroupId && !isFetchingInitial && (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">Please select a fee group to view the report.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
