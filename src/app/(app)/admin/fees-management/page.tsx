
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Layers, 
    Tags, 
    Group, 
    BadgePercent, 
    FileBadge, 
    IndianRupee, 
    LayoutGrid,
    Wallet,
    Receipt,
    Users,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface FeeManagementOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  isImplemented: boolean;
}

const feeConfigOptions: FeeManagementOption[] = [
  {
    id: "student-fees",
    title: "Student Payouts",
    description: "View fee summaries, record payments, and manage individual student fee assignments.",
    icon: Users,
    href: "/admin/student-fees",
    isImplemented: true,
  },
  {
    id: "fee-categories",
    title: "Manage Fee Categories",
    description: "Define fee types like tuition, labs, etc.",
    icon: Tags,
    href: "/admin/fee-categories",
    isImplemented: true,
  },
   {
    id: "fee-types",
    title: "Manage Fee Types",
    description: "Create specific fee variations, like 'Late Fee' or 'Annual Fee'.",
    icon: FileBadge,
    href: "/admin/manage-fee-types",
    isImplemented: true,
  },
  {
    id: "special-fee-types",
    title: "Manage Special Fee Types",
    description: "Handle one-off charges like 'event fee' or 're-exam fee'.",
    icon: FileBadge,
    href: "/admin/manage-special-fee-types",
    isImplemented: true,
  },
  {
    id: "fee-groups",
    title: "Manage Fee Type Groups",
    description: "Group fee types for easier assignment.",
    icon: Group,
    href: "/admin/manage-fee-groups",
    isImplemented: true,
  },
  {
    id: "installments",
    title: "Manage Installments",
    description: "Set up payment installment plans.",
    icon: Layers,
    href: "/admin/manage-installments",
    isImplemented: true,
  },
  {
    id: "concessions",
    title: "Manage Concessions",
    description: "Define and apply fee discounts.",
    icon: BadgePercent,
    href: "/admin/manage-concessions",
    isImplemented: true,
  },
  {
    id: "fee-structures",
    title: "Manage Fee Structures",
    description: "Design fee structures for classes.",
    icon: LayoutGrid,
    href: "/admin/manage-fee-structures",
    isImplemented: true,
  },
  {
    id: "expenses",
    title: "Manage Expenses",
    description: "Track and manage all school expenditures.",
    icon: Wallet,
    href: "/admin/expenses",
    isImplemented: true,
  },
  {
    id: "receipts",
    title: "Receipt Vouchers",
    description: "Create and manage vouchers for other income.",
    icon: Receipt,
    href: "/admin/receipts",
    isImplemented: true,
  },
];

export default function FeesManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fees Management"
        description="A central hub for managing all fee-related activities, from configuration to reporting."
      />
      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
          <CardDescription>
            Select a module below to configure different aspects of your school's fee structure.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feeConfigOptions.map((option) => {
                    const CardWrapper = option.isImplemented ? Link : 'div';
                    return (
                        <CardWrapper key={option.id} href={option.href} className={option.isImplemented ? 'cursor-pointer' : 'cursor-not-allowed'}>
                           <Card className={`h-full transition-all ${option.isImplemented ? 'hover:border-primary hover:shadow-md' : 'bg-muted/50'}`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">{option.title}</CardTitle>
                                    <option.icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                    {!option.isImplemented && (
                                        <div className="text-xs font-semibold text-amber-600 mt-2">Coming Soon</div>
                                    )}
                                </CardContent>
                            </Card>
                        </CardWrapper>
                    )
                })}
            </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Fee Reports</CardTitle>
          <CardDescription>
            Generate and view detailed reports for various financial activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Collection Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col space-y-2 text-sm">
                        <Link href="/admin/fee-reports/collection-report" className="text-primary hover:underline">Daily Fee Collection Report</Link>
                        <Link href="/admin/fee-reports/headwise-collection-report" className="text-primary hover:underline">Headwise Daily Collection</Link>
                        <Link href="/admin/fee-reports/installmentwise-collection-report" className="text-primary hover:underline">Installment Wise Daily Collection</Link>
                        <Link href="/admin/fee-reports/complete-paid-report" className="text-primary hover:underline">Complete Paid Report</Link>
                        <Link href="/admin/fee-reports/online-fee-transaction-report" className="text-primary hover:underline">Online Fee Transaction</Link>
                        <Link href="/admin/fee-reports/year-wise-collection-report" className="text-primary hover:underline">Year Wise Collection</Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Dues Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col space-y-2 text-sm">
                        <Link href="/admin/fee-reports/yearly-dues-report" className="text-primary hover:underline">Yearly Wise Dues</Link>
                        <Link href="/admin/fee-reports/all-student-dues-report" className="text-primary hover:underline">All Student Dues</Link>
                        <Link href="/admin/fee-reports/monthly-dues-report" className="text-primary hover:underline">Month Wise Dues</Link>
                        <Link href="/admin/fee-reports/headwise-dues-report" className="text-primary hover:underline">Headwise Dues</Link>
                        <Link href="/admin/fee-reports/installment-wise-dues-report" className="text-primary hover:underline">Installment Wise Dues</Link>
                        <Link href="/admin/fee-reports/consolidated-dues-report" className="text-primary hover:underline">Consolidate Dues</Link>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-blue-600">Student Wise Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col space-y-2 text-sm">
                        <Link href="#" className="text-primary hover:underline">Student Wise Fees</Link>
                        <Link href="#" className="text-primary hover:underline">Group Wise Fees</Link>
                        <Link href="#" className="text-primary hover:underline">Student Fee Type Wise</Link>
                        <Link href="#" className="text-primary hover:underline">Class Wise Fees</Link>
                        <Link href="#" className="text-primary hover:underline">Student Payment</Link>
                         <Link href="/admin/fee-reports/consolidated-dues-report" className="text-primary hover:underline">Consolidated Fee Report</Link>
                    </CardContent>
                </Card>
              </div>
        </CardContent>
      </Card>
    </div>
  );
}
