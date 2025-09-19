
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClassData, Student } from '@/types';
import { Loader2, Search, ArrowLeft, Download, DollarSign, User } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getConsolidatedFeeReportPageDataAction, getStudentConsolidatedReportAction } from './actions';
import Link from 'next/link';

interface FeeSummary {
    head: string;
    total_payable: number;
    total_paid: number;
    total_due: number;
}

export default function ConsolidatedFeeReportPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<FeeSummary[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
    
    const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    
    const studentsInClass = useMemo(() => {
        return students.filter(s => s.class_id === selectedClassId);
    }, [students, selectedClassId]);

    const overallTotals = useMemo(() => {
        return reportData.reduce((acc, item) => {
            acc.payable += item.total_payable;
            acc.paid += item.total_paid;
            acc.due += item.total_due;
            return acc;
        }, { payable: 0, paid: 0, due: 0 });
    }, [reportData]);

    const loadInitialData = useCallback(async () => {
        setIsFetchingInitialData(true);
        const adminUserId = localStorage.getItem('currentUserId');
        if (!adminUserId) {
            toast({ title: "Error", description: "Context not found. Please log in again.", variant: "destructive" });
            setIsFetchingInitialData(false);
            return;
        }

        const result = await getConsolidatedFeeReportPageDataAction(adminUserId);
        if (result.ok) {
            setClasses(result.classes || []);
            setStudents(result.students || []);
            setCurrentSchoolId(result.schoolId || null);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsFetchingInitialData(false);
    }, [toast]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleSearch = async () => {
        if (!selectedStudentId) {
            toast({ title: "Please select a student", variant: "destructive" });
            return;
        }
        if (!currentSchoolId) {
             toast({ title: "Error", description: "Could not determine school context.", variant: "destructive" });
             return;
        }
        setIsLoading(true);
        
        const result = await getStudentConsolidatedReportAction(selectedStudentId, currentSchoolId);
        if (result.ok) {
            setReportData(result.summary || []);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
            setReportData([]);
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader 
                title="Consolidated Fee Report"
                description="View a complete fee summary for an individual student, broken down by fee head."
                actions={<Button variant="outline" asChild><Link href="/admin/fees-management"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Fee Reports</Link></Button>}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>Select Student</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <Select value={selectedClassId} onValueChange={(val) => {setSelectedClassId(val); setSelectedStudentId(''); setReportData([]);}}>
                        <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="Select a class"/></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.division}</SelectItem>)}</SelectContent>
                    </Select>
                    
                     <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId}>
                        <SelectTrigger className="w-full sm:w-[300px]"><SelectValue placeholder="Select a student"/></SelectTrigger>
                        <SelectContent>{studentsInClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>

                    <Button onClick={handleSearch} disabled={isLoading || !selectedStudentId}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Search
                    </Button>
                </CardContent>
            </Card>

            {reportData.length > 0 && (
                <>
                <Card>
                    <CardHeader><CardTitle>Overall Summary for {students.find(s=>s.id === selectedStudentId)?.name}</CardTitle></CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-300">Total Payable</p>
                            <p className="text-2xl font-bold font-mono">₹{overallTotals.payable.toFixed(2)}</p>
                        </div>
                         <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-300">Total Paid</p>
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
                        <CardTitle>Fee Breakdown by Head</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Head</TableHead>
                                <TableHead className="text-right">Total Payable</TableHead>
                                <TableHead className="text-right">Total Paid</TableHead>
                                <TableHead className="text-right">Total Due</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {reportData.map(d => (
                                    <TableRow key={d.head}>
                                        <TableCell className="font-medium">{d.head}</TableCell>
                                        <TableCell className="text-right font-mono">₹{d.total_payable.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">₹{d.total_paid.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono text-destructive">₹{d.total_due.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                </>
            )}

            {!isLoading && selectedStudentId && reportData.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No fee records found for this student.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
