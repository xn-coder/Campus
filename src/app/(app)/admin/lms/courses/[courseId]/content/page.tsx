
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, BookOpen, Video, FileText, Users as WebinarIcon, FileQuestion, Presentation, Music, MousePointerSquareDashed, ListVideo, Code } from 'lucide-react';
import type { Course, CourseResource, LessonContentResource, CourseResourceType } from '@/types';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { getCourseContentForAdminAction } from '../../actions';

export default function AdminPreviewCourseContentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCourseData() {
      if (!courseId) return;
      setIsLoading(true);
      const result = await getCourseContentForAdminAction(courseId);
      if (result.ok) {
        setCourse(result.course || null);
        setLessons(result.resources?.filter(r => r.type === 'note' && r.url_or_content?.startsWith('[')) || []);
      } else {
        toast({ title: "Error", description: result.message || "Failed to load course details.", variant: "destructive" });
        router.push('/admin/lms/courses');
      }
      setIsLoading(false);
    }
    fetchCourseData();
  }, [courseId, router, toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/> <span className="ml-2">Loading course details...</span></div>;
  }
  if (!course) {
    return <div className="text-center py-10 text-destructive">Course not found. It might have been deleted.</div>;
  }

  const getResourceIcon = (type: string) => {
    const props = { className: "mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" };
    switch(type) {
      case 'ebook': return <BookOpen {...props} />;
      case 'video': return <Video {...props} />;
      case 'note': return <FileText {...props} />;
      case 'webinar': return <WebinarIcon {...props} />;
      case 'quiz': return <FileQuestion {...props} />;
      case 'ppt': return <Presentation {...props} />;
      case 'audio': return <Music {...props} />;
      case 'drag_and_drop': return <MousePointerSquareDashed {...props} />;
      case 'youtube_playlist': return <ListVideo {...props} />;
      case 'web_page': return <Code {...props} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Preview: ${course.title}`} description="This is a read-only preview of the course content." />
      
      <Card>
        <CardHeader>
            <CardTitle>Course Structure</CardTitle>
            <CardDescription>Review the lessons and topics included in this course.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full space-y-2">
                {lessons.map(lesson => {
                    const lessonContents: LessonContentResource[] = JSON.parse(lesson.url_or_content || '[]') as LessonContentResource[];
                    return (
                        <AccordionItem value={lesson.id} key={lesson.id} className="border rounded-md bg-background">
                            <AccordionTrigger className="px-4 hover:no-underline">
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold">{lesson.title}</span>
                                    <span className="text-sm text-muted-foreground">{lessonContents.length} topic(s)</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2 border-t">
                               <div className="space-y-2 py-2">
                                   {lessonContents.length > 0 ? lessonContents.map(res => (
                                       <Link
                                            key={res.id}
                                            href={`/lms/courses/${courseId}/${res.id}?preview=true`}
                                            className="flex items-center p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            {getResourceIcon(res.type)}
                                            <span className="truncate flex-grow" title={res.title}>{res.title}</span>
                                       </Link>
                                   )) : <p className="text-sm text-muted-foreground text-center py-2">This lesson is empty.</p>}
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
             {lessons.length === 0 && <p className="text-muted-foreground text-center py-4">No lessons have been added to this course yet.</p>}
        </CardContent>
        <CardFooter>
            <Button variant="outline" onClick={() => router.push('/admin/lms/courses')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Courses
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
