
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Course, Student, Teacher, UserRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, Users, Briefcase, Loader2, Info, ArrowLeft } from 'lucide-react';
import { enrollUserInCourseAction, unenrollUserFromCourseAction, getEnrollmentPageDataAction } from '../../actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function ManageCourseEnrollmentsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [enrolledTeachers, setEnrolledTeachers] = useState<Teacher[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);

  const [selectedStudentIdToEnroll, setSelectedStudentIdToEnroll] = useState<string>('');
  const [selectedTeacherIdToEnroll, setSelectedTeacherIdToEnroll] = useState<string>('');
  
  const fetchEnrollmentData = useCallback(async (cId: string, adminUserId: string) => {
    setIsLoadingPage(true);
    const result = await getEnrollmentPageDataAction(cId, adminUserId);

    if (result.ok) {
        setCourse(result.course || null);
        setAllStudents(result.allStudents || []);
        setAllTeachers(result.allTeachers || []);
        setEnrolledStudents(result.enrolledStudents || []);
        setEnrolledTeachers(result.enrolledTeachers || []);
    } else {
        toast({ title: "Error Loading Data", description: result.message, variant: "destructive" });
        router.push('/admin/lms/courses');
    }
    setIsLoadingPage(false);
  }, [router, toast]);


  useEffect(() => {
    const adminUserId = localStorage.getItem('currentUserId');
    const schoolId = localStorage.getItem('currentSchoolId'); // Assuming this is set on login
    
    if (adminUserId && courseId) {
      setCurrentSchoolId(schoolId); 
      fetchEnrollmentData(courseId, adminUserId);
    } else {
        toast({title: "Error", description: "Admin user or course not identified.", variant: "destructive"});
        setIsLoadingPage(false);
    }
  }, [courseId, toast, fetchEnrollmentData]);
  

  const handleEnrollUser = async (userType: 'student' | 'teacher') => {
    if (!course || !currentSchoolId) { 
        toast({title: "Error", description: "Course or school context missing.", variant: "destructive"});
        return;
    }
    const userProfileId = userType === 'student' ? selectedStudentIdToEnroll : selectedTeacherIdToEnroll;
    if (!userProfileId) {
        toast({title: "Error", description: `Please select a ${userType} to enroll.`, variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    
    const result = await enrollUserInCourseAction({
      course_id: course.id,
      user_profile_id: userProfileId,
      user_type: userType,
      school_id: currentSchoolId,
    });

    if (result.ok) {
      toast({ title: `${userType.charAt(0).toUpperCase() + userType.slice(1)} Enrolled`, description: result.message });
      const adminUserId = localStorage.getItem('currentUserId');
      if (adminUserId) fetchEnrollmentData(course.id, adminUserId); 
      if(userType === 'student') setSelectedStudentIdToEnroll(''); else setSelectedTeacherIdToEnroll('');
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleUnenrollUser = async (userProfileId: string, userType: 'student' | 'teacher') => {
    if (!course) return;
    if (confirm(`Are you sure you want to unenroll this ${userType}?`)) {
      setIsSubmitting(true);
      const result = await unenrollUserFromCourseAction({
        course_id: course.id,
        user_profile_id: userProfileId,
        user_type: userType,
      });
      if (result.ok) {
        toast({ title: `${userType.charAt(0).toUpperCase() + userType.slice(1)} Unenrolled`, variant: "destructive" });
        const adminUserId = localStorage.getItem('currentUserId');
        if (adminUserId) fetchEnrollmentData(course.id, adminUserId);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };
  
  const enrolledStudentIds = new Set(enrolledStudents.map(s => s.id));
  const enrolledTeacherIds = new Set(enrolledTeachers.map(t => t.id));

  const availableStudentsToEnroll = allStudents.filter(s => !enrolledStudentIds.has(s.id));
  const availableTeachersToEnroll = allTeachers.filter(t => !enrolledTeacherIds.has(t.id));

  const allEnrolledUsers = useMemo(() => {
    const students = enrolledStudents.map(s => ({ ...s, type: 'Student' as const }));
    const teachers = enrolledTeachers.map(t => ({ ...t, type: 'Teacher' as const }));
    return [...students, ...teachers].sort((a,b) => a.name.localeCompare(b.name));
  }, [enrolledStudents, enrolledTeachers]);


  if (isLoadingPage && !course) return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/> Loading course details...</div>;
  if (!course) return <div className="text-center py-10 text-destructive">Course not found. It may have been deleted or is not accessible.</div>;
  
  const renderStudentEnrollmentCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Student Enrollments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Label htmlFor="student-select">Enroll New Students</Label>
          <Select value={selectedStudentIdToEnroll} onValueChange={setSelectedStudentIdToEnroll} disabled={isSubmitting || isLoadingPage}>
            <SelectTrigger id="student-select"><SelectValue placeholder="Select student to enroll" /></SelectTrigger>
            <SelectContent>
              {availableStudentsToEnroll.length > 0 ? availableStudentsToEnroll.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.email})</SelectItem>
              )) : <SelectItem value="-" disabled>No students available to enroll</SelectItem>}
            </SelectContent>
          </Select>
          <Button onClick={() => handleEnrollUser('student')} disabled={isSubmitting || !selectedStudentIdToEnroll || isLoadingPage}>
            {isSubmitting && selectedStudentIdToEnroll ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4" />} Enroll Student
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTeacherEnrollmentCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5" />Teacher Enrollments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Label htmlFor="teacher-select">Enroll New Teachers</Label>
           <Select value={selectedTeacherIdToEnroll} onValueChange={setSelectedTeacherIdToEnroll} disabled={isSubmitting || isLoadingPage}>
            <SelectTrigger id="teacher-select"><SelectValue placeholder="Select teacher to enroll" /></SelectTrigger>
            <SelectContent>
              {availableTeachersToEnroll.length > 0 ? availableTeachersToEnroll.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name} ({t.subject})</SelectItem>
              )) : <SelectItem value="-" disabled>No teachers available to enroll</SelectItem>}
            </SelectContent>
          </Select>
          <Button onClick={() => handleEnrollUser('teacher')} disabled={isSubmitting || !selectedTeacherIdToEnroll || isLoadingPage}>
            {isSubmitting && selectedTeacherIdToEnroll ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4" />} Enroll Teacher
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Manage Enrollments: ${course.title}`} description="Enroll or unenroll users from this course." />
      
        <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Enrollments ({allEnrolledUsers.length})</TabsTrigger>
                <TabsTrigger value="students">Students ({enrolledStudents.length})</TabsTrigger>
                <TabsTrigger value="teachers">Teachers ({enrolledTeachers.length})</TabsTrigger>
            </TabsList>
             <TabsContent value="all">
                <Card>
                    <CardHeader>
                        <CardTitle>All Enrolled Users</CardTitle>
                        <CardDescription>A consolidated list of all students and teachers enrolled in this course.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {allEnrolledUsers.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allEnrolledUsers.map(user => (
                                    <TableRow key={`${user.type}-${user.id}`}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.type === 'Student' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{user.type}</span></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="sm" onClick={() => handleUnenrollUser(user.id, user.type.toLowerCase() as 'student' | 'teacher')} disabled={isSubmitting}>
                                        <UserMinus className="mr-1 h-3 w-3" /> Unenroll
                                        </Button>
                                    </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        ) : <p className="text-sm text-muted-foreground text-center py-4">No users are enrolled in this course yet.</p>}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="students">
                {course.target_audience_in_school === 'teacher' ? (
                     <Card><CardContent className="pt-6 text-center text-muted-foreground">This course is targeted for teachers only.</CardContent></Card>
                ) : renderStudentEnrollmentCard()}
            </TabsContent>
            <TabsContent value="teachers">
                 {course.target_audience_in_school === 'student' ? (
                    <Card><CardContent className="pt-6 text-center text-muted-foreground">This course is targeted for students only.</CardContent></Card>
                 ) : renderTeacherEnrollmentCard()}
            </TabsContent>
        </Tabs>
      
       <Button variant="outline" onClick={() => router.push('/admin/lms/courses')} className="mt-4 self-start" disabled={isSubmitting}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Button>
    </div>
  );
}
