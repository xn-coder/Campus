
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClassData, FeeType, Installment } from '@/types';
import { Loader2, Search, Calendar as CalendarIcon, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid, startOfYear } from 'date-fns';
import { getCompletePaidReportDataAction } from './actions';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE = 10;

export default function CompletePaidReportPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<any[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [feeTypeFilter, setFeeTypeFilter] = useState<'all' | 'fee_type' | 'special_fee_type' | 'installment'>('all');
    const [feeHeadFilter, setFeeHeadFilter] = useState('all');
    const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(new Date()));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    
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

        const result = await getCompletePaidReportDataAction({
            adminUserId,
            filters: {
                classId: classFilter === 'all' ? undefined : classFilter,
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
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
    }, [toast, classFilter, startDate, endDate, searchTerm, feeTypeFilter, feeHeadFilter]);

    useEffect(() => {
        loadReportData(true);
    }, [loadReportData]);

    const handleFeeTypeFilterChange = (value: 'all' | 'fee_type' | 'special_fee_type' | 'installment') => {
        setFeeTypeFilter(value);
        setFeeHeadFilter('all'); // Reset head filter when type changes
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


    const formatDateSafe = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        const dateObj = parseISO(dateString);
        return isValid(dateObj) ? format(dateObj, 'PPpp') : 'Invalid Date';
    };
    
    const getFeeName = (payment: any) => {
        if (payment.installment) return payment.installment.title;
        if (payment.fee_type) return payment.fee_type.name;
        return 'N/A';
    }


    const handleDownloadCsv = () => {
        if (reportData.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const headers = ["Student Name", "Roll No.", "Class", "Section", "Fee Name", "Paid Amount", "Last Payment Mode", "Last Payment Date"];
        const csvRows = [
            headers.join(','),
            ...reportData.map(d => {
                const row = [
                    `"${d.student?.name || 'N/A'}"`,
                    `"${d.student?.roll_number || 'N/A'}"`,
                    `"${d.student?.class?.name || 'N/A'}"`,
                    `"${d.student?.class?.division || 'N/A'}"`,
                    `"${getFeeName(d)}"`,
                    d.paid_amount.toFixed(2),
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
        link.setAttribute("download", `complete_paid_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader 
                title="Complete Paid Fees Report"
                description="View students who have fully paid their dues within a selected period."
                actions={<Button variant="outline" asChild><Link href="/admin/fees-management"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Fees Management</Link></Button>}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter & Search</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <Input placeholder="Search by student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>
                    
                    <div className="flex-grow">
                        <Label>Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "LLL dd, y") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                        </Popover>
                    </div>
                     <div className="flex-grow">
                        <Label>End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "LLL dd, y") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                        </Popover>
                    </div>

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


                    <Button onClick={() => loadReportData()} disabled={isLoading} className="w-full sm:w-auto">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Search</Button>
                    <Button onClick={handleDownloadCsv} disabled={isLoading || reportData.length === 0} variant="outline" className="w-full sm:w-auto md:ml-auto">
                        <Download className="mr-2 h-4 w-4" /> Export to CSV
                    </Button>
                </CardContent>
                 <CardContent>
                    {isLoading ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Roll No.</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Fee Name</TableHead>
                                <TableHead className="text-right">Paid Amount</TableHead>
                                <TableHead>Last Payment Mode</TableHead>
                                <TableHead>Last Payment Date</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {paginatedRecords.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell>{d.student?.name}</TableCell>
                                        <TableCell>{d.student?.roll_number}</TableCell>
                                        <TableCell>{d.student?.class?.name} - {d.student?.class?.division}</TableCell>
                                        <TableCell>{getFeeName(d)}</TableCell>
                                        <TableCell className="text-right font-mono">₹{d.paid_amount.toFixed(2)}</TableCell>
                                        <TableCell>{d.payment_mode}</TableCell>
                                        <TableCell>{formatDateSafe(d.payment_date)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && reportData.length === 0 && <p className="text-center text-muted-foreground py-4">No fully paid records found for the selected criteria.</p>}
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
