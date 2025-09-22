
"use client";

import PageHeader from '@/components/shared/page-header';
import LeaveForm from '@/components/leave-application/leave-form';

export default function LeaveApplicationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Leave Application" 
        description="Submit your leave request for a specific date range. It will be sent to the appropriate person for review."
      />
      <LeaveForm />
    </div>
  );
}
