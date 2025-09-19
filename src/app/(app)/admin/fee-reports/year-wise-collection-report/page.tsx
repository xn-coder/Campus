
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClassData, FeeType, Installment } from '@/types';
import { Loader2, Search, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { getYearWiseCollectionReportDataAction } from './actions';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

const availableYears = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2, new Date().getFullYear() - 3];
const ITEMS_PER_PAGE = 10;

export default function YearWiseCollectionReportPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<any[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
    const [feeTypeFilter, setFeeTypeFilter] = useState<'all' | 'fee_type' | 'special_fee_type' | 'installment'>('all');
    const [feeHeadFilter, setFeeHeadFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    
    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return reportData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [reportData, currentPage]);
    
    const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);

    const loadReportData = useCallback(async (isInitialLoad = false) => {
        setIsLoading(true);
        if (!isInitialLoad) setCurrentPage(1);

        const adminUserId = localStorage.getItem('currentUserId');
        if (!adminUserId) {
            toast({ title: "Error", description: "Admin user not identified.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const result = await getYearWiseCollectionReportDataAction({
            adminUserId,
            filters: {
                classId: classFilter === 'all' ? undefined : classFilter,
                year: parseInt(yearFilter),
                searchTerm: searchTerm,
                feeType: feeTypeFilter === 'all' ? undefined : feeTypeFilter,
                feeHeadId: feeHeadFilter === 'all' ? undefined : feeHeadFilter,
            }
        });
        
        if (result.ok) {
            setReportData(result.reportData || []);
            if (isInitialLoad) {
                if (result.classes) setClasses(result.classes || []);
                if (result.feeTypes) setFeeTypes(result.feeTypes || []);
                if (result.installments) setInstallments(result.installments || []);
            }
        } else {
            toast({ title: "Error", description: result.message || "Failed to load report data.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast, classFilter, yearFilter, searchTerm, feeTypeFilter, feeHeadFilter]);

    useEffect(() => {
        loadReportData(true);
    }, [loadReportData]);

    const handleFeeTypeFilterChange = (value: 'all' | 'fee_type' | 'special_fee_type' | 'installment') => {
        setFeeTypeFilter(value);
        setFeeHeadFilter('all');
    };

    const feeHeadOptions = useMemo(() => {
        if (feeTypeFilter === 'fee_type') {
            return feeTypes.filter(ft => ft.installment_type === 'installments');
        }
        if (feeTypeFilter === 'special_fee_type') {
            return feeTypes.filter(ft => ft.installment_type === 'extra_charge');
        }
        if (feeTypeFilter === 'installment') {
            return installments.map(i => ({ id: i.id, display_name: i.title, name: i.title }));
        }
        return [];
    }, [feeTypeFilter, feeTypes, installments]);

    const getFeeName = (payment: any) => {
        if (payment.fee_type) return payment.fee_type.display_name;
        if (payment.installment) return payment.installment.title;
        return 'N/A';
    }
    
    const formatDateSafe = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        const dateObj = parseISO(dateString);
        return isValid(dateObj) ? format(dateObj, 'PPpp') : 'Invalid Date';
    };

    const handleDownloadCsv = () => {
        if (reportData.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const headers = ["Student Name", "Class", "Fee Name", "Total Amount", "Paid Amount", "Due Amount", "Mode", "Last Payment Date"];
        const csvRows = [
            headers.join(','),
            ...reportData.map(d => {
                const dueAmount = d.assigned_amount - d.paid_amount - (d.total_concession || 0);
                const row = [
                    `"${d.student?.name || 'N/A'}"`,
                    `"${d.student?.class?.name || 'N/A'} - ${d.student?.class?.division || 'N/A'}"`,
                    `"${getFeeName(d)}"`,
                    d.assigned_amount.toFixed(2),
                    d.paid_amount.toFixed(2),
                    dueAmount.toFixed(2),
                    `"${d.payment_mode || 'N/A'}"`,
                    `"${formatDateSafe(d.payment_date)}"`,
                ];
                return row.join(',');
            })
        ];
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `year_wise_report_${yearFilter}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader 
                title="Year Wise Collection Report"
                description="View and filter all fee transactions for a specific academic year."
                actions={<Button variant="outline" asChild><Link href="/admin/fees-management"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Fees Management</Link></Button>}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter & Search</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <Input placeholder="Search by student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>
                    
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select Year"/></SelectTrigger>
                        <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>

                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by class"/></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.division}</SelectItem>)}</SelectContent>
                    </Select>

                    <Select value={feeTypeFilter} onValueChange={handleFeeTypeFilterChange}>
                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Fee Type"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="fee_type">Regular Fee Type</SelectItem>
                            <SelectItem value="special_fee_type">Special Fee Type</SelectItem>
                            <SelectItem value="installment">Installment</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={feeHeadFilter} onValueChange={setFeeHeadFilter} disabled={feeTypeFilter === 'all'}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Head"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Heads</SelectItem>
                            {feeHeadOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.display_name || opt.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => loadReportData(false)} disabled={isLoading} className="w-full sm:w-auto">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Search</Button>
                    <Button onClick={handleDownloadCsv} disabled={isLoading || reportData.length === 0} variant="outline" className="w-full sm:w-auto md:ml-auto">
                        <Download className="mr-2 h-4 w-4" /> Export to CSV
                    </Button>
                </CardContent>
                 <CardContent>
                    {isLoading ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Fee Name</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Paid Amount</TableHead>
                                <TableHead className="text-right">Due Amount</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Last Payment Date</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {paginatedRecords.map(d => {
                                    const dueAmount = d.assigned_amount - d.paid_amount - (d.total_concession || 0);
                                    return (
                                        <TableRow key={d.id}>
                                            <TableCell>{d.student?.name}</TableCell>
                                            <TableCell>{d.student?.class?.name} - {d.student?.class?.division}</TableCell>
                                            <TableCell>{getFeeName(d)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.assigned_amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.paid_amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono text-destructive">₹{dueAmount.toFixed(2)}</TableCell>
                                            <TableCell>{d.payment_mode}</TableCell>
                                            <TableCell>{formatDateSafe(d.payment_date)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && reportData.length === 0 && <p className="text-center text-muted-foreground py-4">No records found for the selected year and criteria.</p>}
                 </CardContent>
                 {totalPages > 1 && (
                    <CardFooter className="flex justify-end items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
