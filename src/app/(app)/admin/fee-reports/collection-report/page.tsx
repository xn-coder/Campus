
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { StudentFeePayment, Student, ClassData, Concession, PaymentMethod } from '@/types';
import { DollarSign, Loader2, Search, Download, Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { getFeeReportDataAction } from './actions';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import Link from 'next/link';

const ITEMS_PER_PAGE = 10;

export default function DailyFeesCollectionReportPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalCollection: 0, totalConcession: 0 });
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'Paid' | 'Dues'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    
    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return reportData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [reportData, currentPage]);
    
    const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);

    const loadReportData = useCallback(async () => {
        setIsLoading(true);
        setCurrentPage(1);
        const adminUserId = localStorage.getItem('currentUserId');
        if (!adminUserId) {
            toast({ title: "Error", description: "Admin user not identified.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const result = await getFeeReportDataAction({
            adminUserId,
            filters: {
                paymentStatus: paymentStatusFilter,
                classId: classFilter === 'all' ? undefined : classFilter,
                date: date ? format(date, 'yyyy-MM-dd') : undefined,
                searchTerm: searchTerm,
            }
        });
        
        if (result.ok) {
            setReportData(result.reportData || []);
            setSummary(result.summary || { totalCollection: 0, totalConcession: 0 });
            if (classes.length === 0 && result.classes) {
              setClasses(result.classes || []);
            }
        } else {
            toast({ title: "Error", description: result.message || "Failed to load report data.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast, classFilter, date, searchTerm, paymentStatusFilter, classes.length]);

    useEffect(() => {
        setDate(new Date());
    }, []);

    useEffect(() => {
        // Run once on initial load when `date` is first set.
        if (date) {
            loadReportData();
        }
    }, [loadReportData, date]);
    
    const formatDateSafe = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        const dateObj = parseISO(dateString);
        return isValid(dateObj) ? format(dateObj, 'PPpp') : 'Invalid Date';
    };
    
    const handleDownloadCsv = () => {
        if (reportData.length === 0) {
            toast({ title: "No data to export", variant: "destructive"});
            return;
        }
        const headers = ["Student Name", "Roll No.", "Class", "Section", "Total Amount", "Concession", "Paid Amount", "Due Amount", "Mode", "Date & Time"];
        const csvRows = [
            headers.join(','),
            ...reportData.map(d => {
                const dueAmount = d.assigned_amount - d.paid_amount - d.total_concession;
                const row = [
                    `"${d.student?.name || 'N/A'}"`,
                    `"${d.student?.roll_number || 'N/A'}"`,
                    `"${d.student?.class?.name || 'N/A'}"`,
                    `"${d.student?.class?.division || 'N/A'}"`,
                    d.assigned_amount,
                    d.total_concession,
                    d.paid_amount,
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
        link.setAttribute("download", `daily_collection_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader 
                title="Daily Fees Collection Report"
                description="View and filter all fee payments collected for a specific day."
                actions={<Button variant="outline" asChild><Link href="/admin/fees-management"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Fees Management</Link></Button>}
            />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Collection</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold font-mono">₹{summary.totalCollection.toFixed(2)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Concession Given</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold font-mono">₹{summary.totalConcession.toFixed(2)}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter & Search</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <Input placeholder="Search by student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>
                    
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className="w-full md:w-auto justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "LLL dd, y") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent>
                    </Popover>

                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Filter by class"/></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.division}</SelectItem>)}</SelectContent>
                    </Select>

                    <Select value={paymentStatusFilter} onValueChange={(val) => setPaymentStatusFilter(val as any)}>
                        <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Payment Status"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Dues">Dues</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={loadReportData} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Search</Button>
                     <Button onClick={handleDownloadCsv} disabled={isLoading || reportData.length === 0} variant="outline" className="md:ml-auto">
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
                                <TableHead>Section</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Concession</TableHead>
                                <TableHead className="text-right">Paid Amount</TableHead>
                                <TableHead className="text-right">Due Amount</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Date & Time</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {paginatedRecords.map(d => {
                                    const dueAmount = d.assigned_amount - d.paid_amount - d.total_concession;
                                    return (
                                        <TableRow key={d.id}>
                                            <TableCell>{d.student?.name}</TableCell>
                                            <TableCell>{d.student?.roll_number}</TableCell>
                                            <TableCell>{d.student?.class?.name}</TableCell>
                                            <TableCell>{d.student?.class?.division}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.assigned_amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.total_concession.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{d.paid_amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{dueAmount.toFixed(2)}</TableCell>
                                            <TableCell>{d.payment_mode}</TableCell>
                                            <TableCell>{formatDateSafe(d.payment_date)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && reportData.length === 0 && <p className="text-center text-muted-foreground py-4">No collection records found for the selected criteria.</p>}
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
