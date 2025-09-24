
# CampusHub Project Details

This document provides a comprehensive overview of the CampusHub application, detailing its structure, features, and the specific roles and permissions for each user type.

## 1. User Roles & Capabilities

The application is built around a multi-tenant architecture with distinct roles, each having specific access and functionalities.

### 1.1 Super Admin (`superadmin`)
The Super Admin has the highest level of control over the entire platform. Their primary responsibilities are managing schools and global course content.

- **School Management**:
  - **Create Schools**: Can register new schools on the platform, creating an associated Principal (Admin) account for each (`/superadmin/create-school`).
  - **Manage Schools**: Can view a list of all registered schools, edit their details (name, address), and change their status (Active/Inactive) (`/superadmin/manage-school`).
- **Global LMS Management**:
  - **Create & Manage Courses**: Can create globally available courses, define their pricing, and manage their content (`/superadmin/lms/courses`).
  - **Assign Courses**: Can assign or make global courses available to specific schools.
- **Global Announcements**: Can post announcements visible to all school administrators (`/communication`).

### 1.2 Admin / Principal (`admin`)
The Admin is the primary manager of an individual school. They have wide-ranging permissions to manage all aspects of their school's operations.

- **User Management**:
  - **Manage Students**: View, edit, and terminate student profiles. This is distinct from the initial admission process (`/admin/manage-students`).
  - **Manage Teachers**: Create, view, edit, and deactivate teacher profiles and their associated login accounts (`/admin/manage-teachers`).
  - **Manage Accountants**: Create, view, edit, and deactivate accountant profiles and their login accounts (`/admin/manage-accountants`).
- **Academic Configuration**:
  - **Academic Years**: Define and manage academic years for the school (`/admin/academic-years`).
  - **Class & Section Management**: Define class names (e.g., "Grade 10") and section names (e.g., "A"), then activate them as usable class-sections. Can assign teachers, subjects, and students to these activated classes (`/class-management`).
  - **Subjects**: Create and manage subjects offered by the school, optionally linking them to academic years (`/admin/subjects`).
  - **Exams**: Schedule examination events for the entire school or specific classes (`/admin/exams`).
  - **Class Schedule**: Define the weekly timetable for classes, assigning subjects and teachers to specific time slots (`/admin/class-schedule`).
- **Financial Management (Full Access)**:
  - **Fees & Expenses**: Has full control over all fee configurations (categories, types, structures, installments) and expense tracking (`/admin/fees-management`, `/admin/expenses`, etc.).
  - **Reporting**: Can view all financial and student dues reports.
- **Admissions**:
  - **New Admissions**: Can admit new students, which creates their student profile and login credentials simultaneously (`/admin/admissions/new`).
  - **View Records**: Can view and manage all admission records (`/admin/admissions`).
- **LMS Management**:
  - **Course Catalog**: Views courses made available by the Super Admin and can "enroll" the school to make them accessible (`/admin/lms/courses`).
  - **User Enrollment**: Manages which students and teachers are enrolled in which course (`/admin/lms/courses/[courseId]/enrollments`).
- **Communication & Events**:
  - **Announcements**: Can post announcements to the entire school, specific classes, or specific user roles (students/teachers) (`/communication`).
  - **Calendar**: Can create, edit, and delete school-wide events on the calendar (`/calendar-events`).
- **Leave & Certificate Management**:
  - **Leave Management**: Can view and approve/reject leave requests from all users (teachers, students, accountants) within the school (`/admin/leave-management`).
    - **TC Requests**: Views a log of automatically issued Transfer Certificates (`/admin/tc-requests`).

### 1.3 Teacher (`teacher`)
Teachers manage the academic activities for the classes they are assigned to.

- **Class & Student Management**:
  - **My Classes**: View a list of classes they are assigned to and the students enrolled in each (`/teacher/my-classes`).
  - **My Students**: View a consolidated roster of all students they teach (`/teacher/my-students`).
- **Academic Tasks**:
  - **Attendance**: Mark daily attendance for their assigned classes (`/teacher/attendance`).
  - **Assignments**: Post and manage assignments for their classes (`/teacher/post-assignments`, `/teacher/assignment-history`).
  - **Grading**: View student submissions for assignments and provide grades and feedback (`/teacher/grade-assignments`).
  - **Gradebook**: Enter student scores for exams in the subjects they teach (`/teacher/student-scores`).
- **LMS**: Can enroll in and view courses made available to teachers by the admin.
- **Communication**: Can post announcements targeted to the specific classes they teach (`/communication`).
- **Personal Management**:
  - **Profile**: Can view and edit their own limited profile information (`/teacher/profile`).
  - **Leave**: Can apply for personal leave and view their own leave history (`/leave-application`).

### 1.4 Student (`student`)
Students interact with the system to access academic information and perform personal tasks.

- **Academics**:
  - **Assignments**: View and submit assignments posted by their teachers (`/student/assignments`).
  - **Scores**: View their report cards and exam scores (`/student/my-scores`).
  - **Subjects**: View a list of subjects for their academic program (`/student/subjects`).
  - **Attendance**: View their own attendance history (`/student/attendance-history`).
- **LMS**: Can enroll in and view courses made available to them by the admin (`/lms/available-courses`).
- **Financials**:
  - **Payment History**: View their complete fee payment history, including assigned fees, payments made, and outstanding dues (`/student/payment-history`).
- **Personal Management**:
  - **Profile**: Can view and edit their own limited profile information (`/student/my-profile`).
  - **Leave**: Can apply for personal leave and view their own leave history (`/leave-application`).
  - **Transfer Certificate**: Can request a Transfer Certificate, which is auto-approved if all fees are cleared (`/student/apply-tc`).
- **Communication**: View announcements targeted to them, their class, or the whole school (`/communication`).

### 1.5 Accountant (`accountant`)
The Accountant role is focused on financial management and record-keeping, with read-only access to some student data.

- **Financial Management**:
  - **Student Fees**: Has full access to the "Student Payouts" page to record and manage fee payments (`/admin/student-fees`).
  - **Fee Configuration**: Has access to all fee configuration pages (categories, types, structures, etc.) under the `/admin/fees-management` section. This allows them to set up and manage the school's entire fee system.
  - **Expense Management**: Can create, view, edit, and delete expense records and manage expense categories (`/admin/expenses`).
  - **Receipt Vouchers**: Can create and manage receipt vouchers for miscellaneous income (`/admin/receipts`).
- **Reporting**: Can view all financial reports, including collection, dues, and transaction reports.
- **Admissions**: Has read-only access to admission records to facilitate fee management (`/admin/admissions`). They cannot admit new students.
- **Personal Management**:
  - **Leave**: Can apply for personal leave and view their own leave history (`/leave-application`).
- **Communication**: View announcements targeted to them or the whole school (`/communication`).

---

## 2. Project Structure & File Descriptions

This section details the purpose of major directories and files in the project.

### `src/app/`
This is the root of the Next.js App Router.

- **`(auth)/`**: Contains routes related to user authentication.
  - `login/page.tsx`: The main login page component.
  - `login/actions.ts`: Server actions for handling login logic, including password verification and user session creation.
- **`(app)/`**: Contains all authenticated application routes.
  - `layout.tsx`: The main layout for the authenticated app, wrapping everything in the `AppLayout` which includes the sidebar.
  - `dashboard/page.tsx`: The landing page after login, which dynamically displays stats and links based on user role.
  - `admin/`: Directory for all administrator-specific pages.
    - `fees-management/`: A hub page linking to all fee-related configuration pages.
    - `fee-reports/`: Directory containing various financial report pages.
    - `lms/`: Admin's interface for managing the Learning Management System for their school.
    - `manage-students/`: Page for viewing, editing, and managing all student profiles.
    - `... (and others)`: Each sub-directory corresponds to a specific admin feature.
  - `student/`: Directory for all student-specific pages.
  - `teacher/`: Directory for all teacher-specific pages.
  - `superadmin/`: Directory for all super-admin-specific pages.
  - `communication/`: Shared page for viewing and posting announcements.
  - `calendar-events/`: Shared page for the school calendar.
- `globals.css`: Global stylesheet, including Tailwind CSS directives and the HSL-based CSS variables for theming.
- `layout.tsx`: The root layout for the entire application, including `<html>` and `<body>` tags.
- `page.tsx`: The root page of the site, which simply redirects to `/login`.

### `src/actions/`
Contains global server actions that can be used across different parts of the application.

- `userActions.ts`: Actions related to user accounts, such as updating passwords or deactivating accounts.

### `src/components/`
Home for all React components.

- **`layout/`**: Components related to the overall page structure.
  - `app-layout.tsx`: The main layout component that includes the sidebar.
  - `sidebar-nav.tsx`: Defines the navigation items for each user role. (Note: This logic is now inside `sidebar.tsx`).
- **`shared/`**: Reusable components used across multiple pages (e.g., `PageHeader`, `IdCardPreview`).
- **`ui/`**: Core UI components, mostly from `shadcn/ui`, such as `Button`, `Card`, `Input`, etc.
  - `sidebar.tsx`: A complex component that handles the entire sidebar logic, including collapsible state, mobile view (sheet), and dynamic rendering of navigation items based on user role.
- **`lms/`**: Components specifically for the Learning Management System.
  - `dnd/`: Components for Drag-and-Drop activities.
  - `WebPageRenderer.tsx`: Renders dynamic web page content created in the LMS.

### `src/lib/`
Contains library code, utilities, and configurations.

- `supabaseClient.ts`: Initializes and exports Supabase client instances for both client-side and server-side use.
- `utils.ts`: General utility functions, like `cn()` for merging Tailwind classes.
- `schema/`: Contains SQL files for database schema setup.
  - `lms_favorites.sql`: The SQL to create the table for the "favorite courses" feature.

### `src/services/`
Contains services that interact with external APIs.

- `emailService.ts`: A server-side module for sending emails via the Resend API. It handles batching and provides helper functions to get recipient email addresses from the database.

### `src/types/`
- `index.ts`: Centralized location for all TypeScript type definitions and enums used throughout the application (e.g., `UserRole`, `Student`, `Course`).

---

## 3. Key Features Deep Dive

### Authentication and Authorization
- **Login**: Managed by `(auth)/login/page.tsx` and `actions.ts`. It uses `bcryptjs` to compare the provided password with the stored `password_hash`.
- **Role-Based Access**: The user's role is stored in local storage upon login. The `Sidebar` component in `src/components/ui/sidebar.tsx` reads this role to render the appropriate navigation menu. Server actions and API routes should re-verify the user's role and permissions using their user ID for security.

### Fees & Expense Management (`/admin/...`)
- This is a comprehensive module for financial tracking.
- **Configuration**: Admins can define `Fee Categories` (Tuition, Transport), `Fee Types` (Regular Fee, Special Charge), `Installments`, and `Concessions`.
- **Structures**: They can then create `Fee Structures` that link these categories to specific classes and academic years.
- **Assignment**: Fees can be assigned to students individually, by class, or in groups.
- **Payment**: The `Student Payouts` page (`/admin/student-fees`) is the central hub for accountants or admins to manually record payments against assigned fees.
- **Reporting**: A suite of reports under `/admin/fee-reports/` provides detailed insights into collections, dues, and transactions, with various filtering options.
- **Expenses**: The `/admin/expenses` section allows for tracking of school expenditures, separate from student fees, complete with categories and voucher generation.

### Learning Management System (LMS)
- **Course Creation (Super Admin)**: The Super Admin creates the master courses, setting pricing, subscription models, and initial content (`/superadmin/lms/courses`).
- **Course Assignment (Super Admin)**: The Super Admin assigns these global courses to schools.
- **School Catalog (Admin)**: The school Admin sees the list of assigned courses and can choose to "enroll" their school, making the course available to their users (`/admin/lms/courses`).
- **User Enrollment (Admin)**: The Admin can then manage which specific students or teachers are enrolled in an available course.
- **Course Consumption (Student/Teacher)**: Enrolled users can access the course content through `/lms/available-courses`. The system tracks their progress, including which resources they have completed. A "Start Course" button navigates them to the first piece of content. Navigation is sequential, requiring completion of the previous item to unlock the next.
- **Content Types**: The LMS supports various content types, including video embeds, PDF/ebooks, rich-text notes, quizzes, and interactive drag-and-drop activities.

### Communication
- The `/communication` page serves as a central announcement board.
- **Super Admins** post global announcements to all school admins.
- **Admins** can post announcements to their entire school, to specific roles (students/teachers), or to a single class.
- **Teachers** can post announcements only to the classes they are assigned to.
- **Students & Accountants** have read-only access.
- An email notification system, powered by `emailService.ts`, sends emails to the relevant audience whenever a new announcement is posted.
