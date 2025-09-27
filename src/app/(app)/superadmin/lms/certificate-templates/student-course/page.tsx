
"use client";

import PageHeader from '@/components/shared/page-header';
import CertificateEditor from '@/components/lms/certificate-editor';
import { getCertificateTemplateAction, saveCertificateTemplateAction } from '../actions';
import type { CertificateTemplate } from '@/types';

export default function StudentCourseCertificatePage() {
  
  const templateType = "student_course_completion";

  const placeholderVariables = [
    { value: '{{student_name}}', label: 'Student Name' },
    { value: '{{course_name}}', label: 'Course Name' },
    { value: '{{completion_date}}', label: 'Completion Date' },
    { value: '{{school_name}}', label: 'School Name' },
    { value: '{{certificate_id}}', label: 'Certificate ID (QR)' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit: Student Course Completion Certificate"
        description="Design the template that will be issued to students when they complete an entire course."
      />
      <CertificateEditor 
        templateType={templateType}
        getTemplateAction={getCertificateTemplateAction}
        saveTemplateAction={saveCertificateTemplateAction}
        placeholderVariables={placeholderVariables}
      />
    </div>
  );
}
