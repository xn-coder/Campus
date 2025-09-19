
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { ClassData, Student, Installment } from '@/types';
import { Loader2, Search, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getInstallmentWiseDuesReportDataAction } from './actions';
import Link from 'next/link';

const ITEMS_PER_PAGE = 10;

type StudentWithDues = Student & { dueAmount: number, class?: { name: string, division: string } | null };

export default function InstallmentWiseDuesReportPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<StudentWithDues[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [installmentFilter, setInstallmentFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return reportData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [reportData, currentPage]);
    
    const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);
    const totalDueAmount = useMemo(() => reportData.reduce((sum, item) => sum + item.dueAmount, 0), [reportData]);

    const loadReportData = useCallback(async (isInitialLoad = false) => {
        setIsLoading(true);
        const adminUserId = localStorage.getItem('currentUserId');
        if (!adminUserId) {
            toast({ title: "Error", description: "Admin user not identified.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const result = await getInstallmentWiseDuesReportDataAction({
            adminUserId,
            filters: {
                installmentId: installmentFilter,
                classId: classFilter === 'all' ? undefined : classFilter,
                searchTerm: searchTerm,
            }
        });
        
        if (result.ok) {
            setReportData(result.reportData || []);
            if (classes.length === 0 && result.classes) setClasses(result.classes || []);
            if (result.installments) {
                setInstallments(result.installments || []);
                if (isInitialLoad && result.installments.length > 0 && !installmentFilter) {
                    setInstallmentFilter(result.installments[0].id);
                }
            }
        } else {
            toast({ title: "Error", description: result.message || "Failed to load report data.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast, classFilter, searchTerm, installmentFilter, classes.length]);

    useEffect(() => {
        loadReportData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = () => {
        setCurrentPage(1);
        loadReportData();
    };

    const handleDownloadCsv = () => {
        if (reportData.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const headers = ["Roll No.", "Student Name", "Father Name", "Class", "Section", "Mobile No.", "Due Amount"];
        const csvRows = [
            headers.join(','),
            ...reportData.map(d => {
                const row = [
                    `"${d.roll_number || 'N/A'}"`,
                    `"${d.name || 'N/A'}"`,
                    `"${d.father_name || 'N/A'}"`,
                    `"${d.class?.name || 'N/A'}"`,
                    `"${d.class?.division || 'N/A'}"`,
                    `"${d.contact_number || 'N/A'}"`,
                    d.dueAmount.toFixed(2),
                ];
                return row.join(',');
            })
        ];
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `installment_wise_dues_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader 
                title="Installment Wise Dues Report"
                description="View outstanding student dues filtered by a specific payment installment."
                actions={<Button variant="outline" asChild><Link href="/admin/fees-management"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Fees Management</Link></Button>}
            />

             <Card>
                <CardHeader>
                    <CardTitle>Total Outstanding Dues for Selected Installment</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold font-mono">₹{totalDueAmount.toFixed(2)}</p>
                </CardContent>
             </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter & Search</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <div className="flex-grow">
                        <Label>Select Installment</Label>
                        <Select value={installmentFilter} onValueChange={setInstallmentFilter} disabled={installments.length === 0}>
                            <SelectTrigger><SelectValue placeholder="Select an installment"/></SelectTrigger>
                            <SelectContent>{installments.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="flex-grow">
                        <Label>Search Student / Father</Label>
                        <Input placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <div className="flex-grow">
                        <Label>Filter by Class</Label>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger><SelectValue placeholder="Filter by class"/></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.division}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleSearch} disabled={isLoading || !installmentFilter} className="w-full sm:w-auto">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Search</Button>
                    <Button onClick={handleDownloadCsv} disabled={isLoading || reportData.length === 0} variant="outline" className="w-full sm:w-auto md:ml-auto">
                        <Download className="mr-2 h-4 w-4" /> Export to CSV
                    </Button>
                </CardContent>
                 <CardContent>
                    {isLoading ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Roll No.</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Father Name</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Mobile No.</TableHead>
                                <TableHead className="text-right">Due Amount</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {paginatedRecords.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell>{d.roll_number || 'N/A'}</TableCell>
                                        <TableCell>{d.name}</TableCell>
                                        <TableCell>{d.father_name || 'N/A'}</TableCell>
                                        <TableCell>{d.class?.name || 'N/A'}</TableCell>
                                        <TableCell>{d.class?.division || 'N/A'}</TableCell>
                                        <TableCell>{d.contact_number || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-mono text-destructive">₹{d.dueAmount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && reportData.length === 0 && <p className="text-center text-muted-foreground py-4">No student dues found for the selected criteria.</p>}
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
