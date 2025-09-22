
"use client";

import { useState, type FormEvent, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, UploadCloud } from 'lucide-react';
import type { User, Student, UserRole, SchoolEntry, StoredLeaveApplicationDB, Teacher, Accountant } from '@/types';
import { submitLeaveApplicationAction, getUserProfileForLeaveAction } from '@/app/(app)/leave-application/actions';
import { useToast } from '@/hooks/use-toast';
import { fileToDataUri } from '@/lib/utils';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

const formSchema = z.object({
  applicantName: z.string().min(1, "Applicant name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters long"),
  medicalNotes: z.any().optional(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date cannot be before start date",
    path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof formSchema>;

export default function LeaveForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);


  const { control, handleSubmit, register, formState: { errors }, reset, setValue } = useForm<LeaveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicantName: '',
      startDate: '',
      endDate: '',
      reason: '',
    }
  });
  
  const loadUserContext = useCallback(async () => {
    const role = localStorage.getItem('currentUserRole') as UserRole | null;
    const userId = localStorage.getItem('currentUserId');
    const userName = localStorage.getItem('currentUserName');

    setCurrentUserRole(role);
    setCurrentUserId(userId);
    setValue('applicantName', userName || '');

    if (userId && role) {
        const { schoolId } = await getUserProfileForLeaveAction(userId, role);
        setCurrentSchoolId(schoolId);
    }
  }, [setValue, toast]);

  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);


  const onSubmit = async (data: LeaveFormValues) => {
    setIsLoading(true);
    setError(null);

    if (!currentUserId || !currentUserRole || !currentSchoolId) {
      setError("User context or school ID is missing. Cannot submit application.");
      setIsLoading(false);
      return;
    }

    try {
      let medicalNotesDataUri: string | undefined = undefined;
      if (data.medicalNotes && data.medicalNotes[0]) {
        try {
          medicalNotesDataUri = await fileToDataUri(data.medicalNotes[0]);
        } catch (e) {
          setError("Failed to read the medical notes file.");
          toast({ title: "File Error", description: "Could not process the uploaded file.", variant: "destructive"});
          setIsLoading(false);
          return;
        }
      }

      const result = await submitLeaveApplicationAction({
        applicant_name: data.applicantName,
        reason: data.reason,
        start_date: data.startDate,
        end_date: data.endDate,
        medical_notes_data_uri: medicalNotesDataUri,
        applicant_user_id: currentUserId,
        applicant_role: currentUserRole,
        school_id: currentSchoolId,
      });

      if (result.ok && result.application) {
        toast({ title: "Application Submitted", description: result.message});
        
        const resetValues = { reason: '', startDate: '', endDate: '', medicalNotes: undefined, applicantName: data.applicantName };
        reset(resetValues);
        setFileName(null);
        // Let the parent page handle what happens next (like re-fetching)
      } else {
        setError(result.message || "Failed to save application to database.");
        toast({ title: "Submission Error", description: result.message || "Failed to save application.", variant: "destructive"});
      }
      
    } catch (e: any) {
      console.error("Error during submission action:", e);
      setError(e.message || "An error occurred while processing your application.");
      toast({ title: "Processing Error", description: e.message || "An error occurred.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Application</CardTitle>
        <CardDescription>Fill in the details for your leave request.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="applicantName">Applicant Name</Label>
            <Controller
              name="applicantName"
              control={control}
              render={({ field }) => <Input id="applicantName" placeholder="Enter your full name" {...field} disabled />}
            />
            {errors.applicantName && <p className="text-sm text-destructive mt-1">{errors.applicantName.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Controller name="startDate" control={control} render={({ field }) => <Input id="startDate" type="date" {...field} />} />
                  {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Controller name="endDate" control={control} render={({ field }) => <Input id="endDate" type="date" {...field} />} />
                  {errors.endDate && <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Absence</Label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => <Textarea id="reason" placeholder="Explain the reason for absence..." {...field} />}
            />
            {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
          </div>

          <div>
            <Label htmlFor="medicalNotes">Upload Document (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Label 
                htmlFor="medicalNotes-upload" 
                className="flex items-center justify-center w-full px-4 py-2 border border-dashed rounded-md cursor-pointer hover:border-primary"
              >
                <UploadCloud className="w-5 h-5 mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {fileName || "Click to upload a file (PDF, JPG, PNG)"}
                </span>
              </Label>
              <Input 
                id="medicalNotes-upload" 
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                {...register("medicalNotes", { onChange: handleFileChange })}
              />
            </div>
            {errors.medicalNotes && <p className="text-sm text-destructive mt-1">{errors.medicalNotes.message?.toString()}</p>}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
            <Button type="submit" disabled={isLoading || !currentSchoolId} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
