
"use client";

import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Award } from 'lucide-react';
import Link from 'next/link';

interface CertificateTemplateOption {
  title: string;
  description: string;
  href: string;
}

const certificateTemplates: CertificateTemplateOption[] = [
  {
    title: 'Student Course Completion',
    description: 'The certificate awarded to a student upon completing all topics in a course.',
    href: '/superadmin/lms/certificate-templates/student-course',
  },
  {
    title: 'Student Lesson Completion',
    description: 'The certificate awarded to a student upon completing all topics in a single lesson.',
    href: '/superadmin/lms/certificate-templates/student-lesson',
  },
  {
    title: 'Teacher Course Completion',
    description: 'The certificate awarded to a teacher for completing a professional development course.',
    href: '/superadmin/lms/certificate-templates/teacher-course',
  },
  {
    title: 'Teacher Lesson Completion',
    description: 'Awarded to teachers for completing individual professional development modules or lessons.',
    href: '/superadmin/lms/certificate-templates/teacher-lesson',
  },
];

export default function CertificateTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manage Certificate Templates"
        description="Design and customize the certificates awarded to users upon course and lesson completion."
      />
      <Card>
        <CardHeader>
          <CardTitle>Certificate Types</CardTitle>
          <CardDescription>
            Select a certificate type to open the editor and customize its appearance and content.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {certificateTemplates.map((template) => (
            <Card key={template.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  {template.title}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" asChild>
                  <Link href={template.href}>
                    Edit Template <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
