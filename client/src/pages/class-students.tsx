import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Users,
    ArrowLeft,
    Plus,
    FileSpreadsheet,
    CheckCircle2,
    Trophy,
    Pencil,
    Trash2,
    Search,
    Loader2,
    Calendar,
    Mail
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

export default function ClassStudentsPage() {
    const [, params] = useRoute("/classes/:id/students");
    const [, setLocation] = useLocation();
    const classId = parseInt(params?.id || "0");
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const { user } = useAuth();
    const isTechSupport = user?.role === "tech-support";
    const [editingStudent, setEditingStudent] = useState<any>(null);

    const editStudentSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        studentId: z.string().optional(),
        joinedAt: z.string().optional(),
    });

    type EditStudentForm = z.infer<typeof editStudentSchema>;

    const editForm = useForm<EditStudentForm>({
        resolver: zodResolver(editStudentSchema),
        defaultValues: {
            name: "",
            email: "",
            studentId: "",
            joinedAt: "",
        },
    });

    // Update form when editingStudent changes
    const openEditDialog = (student: any) => {
        setEditingStudent(student);
        editForm.reset({
            name: student.name || "",
            email: student.email || "",
            studentId: student.studentId || "",
            joinedAt: student.joinedAt ? format(new Date(student.joinedAt), "yyyy-MM-dd") : "",
        });
    };

    // Fetch Class Info
    const { data: cls, isLoading: isClassLoading } = useQuery<any>({
        queryKey: [`/api/classes/${classId}`],
        enabled: !!classId,
    });

    // Fetch Students with Mappings
    const { data: students, isLoading: isStudentsLoading } = useQuery<any[]>({
        queryKey: [`/api/classes/${classId}/student-mappings`],
        enabled: !!classId,
    });

    // Fetch Available Leads
    const { data: readyForClassLeads } = useQuery<any>({
        queryKey: ["/api/leads/ready-for-class"],
    });

    const addStudentsMutation = useMutation({
        mutationFn: async (leadIds: number[]) => {
            await apiRequest("POST", `/api/classes/${classId}/students`, { leadIds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/student-mappings`] });
            setIsAddStudentOpen(false);
            setSelectedStudentIds([]);
            toast({ title: "Success", description: "Students added to class" });
        },
    });

    // Generate Student IDs Mutation
    const generateIdsMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/classes/${classId}/generate-student-ids`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/student-mappings`] });
            toast({ title: "Success", description: "Student IDs generated successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    // Delete Student from Class Mutation
    const deleteStudentMutation = useMutation({
        mutationFn: async (leadId: number) => {
            await apiRequest("DELETE", `/api/classes/${classId}/students/${leadId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/student-mappings`] });
            toast({ title: "Success", description: "Student removed from class" });
        },
    });

    const updateStudentMutation = useMutation({
        mutationFn: async ({ leadId, data, mappingData }: { leadId: number, data: any, mappingData: any }) => {
            // Updated lead info (Name, Email)
            await apiRequest("PUT", `/api/leads/${leadId}`, data);
            // Update mapping info (Student ID, Joined At)
            await apiRequest("PATCH", `/api/classes/${classId}/students/${leadId}/mapping`, mappingData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/student-mappings`] });
            toast({ title: "Success", description: "Student updated successfully" });
            setEditingStudent(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const onEditSubmit = (data: EditStudentForm) => {
        if (!editingStudent) return;
        updateStudentMutation.mutate({
            leadId: editingStudent.id,
            data: {
                name: data.name,
                email: data.email,
            },
            mappingData: {
                studentId: data.studentId,
                joinedAt: data.joinedAt,
            }
        });
    };

    const filteredStudents = students?.filter((s: any) =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isClassLoading || isStudentsLoading) {
        return (
            <>
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </main>
            </>
        );
    }

    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/classes")}
                        className="text-slate-500 hover:text-slate-900 gap-2 px-0 hover:bg-transparent"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setLocation("/classes")}>Classes</span>
                        <span>/</span>
                        <span className="text-slate-400">{cls?.name}</span>
                    </nav>

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Users className="h-6 w-6 text-slate-600" />
                                </div>
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    Students - {cls?.name}
                                </h1>
                            </div>
                            <p className="text-slate-500 ml-12 font-medium">{cls?.subject || 'Class'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                className="bg-[#10B981] hover:bg-[#059669] text-white gap-2 h-10 px-5 rounded-lg shadow-sm"
                                onClick={() => toast({ title: "Coming Soon", description: "Attendance marking feature is under construction" })}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark Attendance
                            </Button>
                            <Button
                                variant="outline"
                                className="border-amber-400 text-amber-600 hover:bg-amber-50 gap-2 h-10 px-5 rounded-lg bg-white"
                                onClick={() => setLocation(`/classes/${classId}/marks`)}
                            >
                                <Trophy className="h-4 w-4" />
                                Marks
                            </Button>
                            {!isTechSupport && (
                                <>
                                    <Button
                                        className="bg-[#4F46E5] hover:bg-[#4338CA] text-white gap-2 h-10 px-5 rounded-lg shadow-sm"
                                        onClick={() => setIsAddStudentOpen(true)}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Student
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2 h-10 px-5 rounded-lg bg-white"
                                        onClick={() => generateIdsMutation.mutate()}
                                        disabled={generateIdsMutation.isPending}
                                    >
                                        {generateIdsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Generate Student IDs
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2 h-10 px-5 rounded-lg bg-white"
                                        onClick={() => toast({ title: "Coming Soon", description: "Bulk import is coming soon" })}
                                    >
                                        <FileSpreadsheet className="h-4 w-4" />
                                        Bulk Import
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Table Card */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold text-slate-800">Enrolled Students</CardTitle>
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search students..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 h-9 border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 transition-all text-sm bg-white"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="w-[150px] font-bold text-slate-600 px-6">Student ID</TableHead>
                                        <TableHead className="font-bold text-slate-600">Name</TableHead>
                                        <TableHead className="font-bold text-slate-600">Email</TableHead>
                                        <TableHead className="font-bold text-slate-600">Added Date</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600 pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents?.map((student: any) => (
                                        <TableRow key={student.id} className="hover:bg-slate-50/30 transition-colors border-slate-100 group">
                                            <TableCell className="px-6">
                                                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs">
                                                    {student.studentId || "PENDING"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-800">{student.name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Mail className="h-3 w-3" />
                                                    {student.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Calendar className="h-3 w-3" />
                                                    {student.joinedAt ? format(new Date(student.joinedAt), "MMM dd, yyyy") : "N/A"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 gap-1.5 text-xs font-bold rounded-md"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" /> Attendance
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 gap-1.5 text-xs font-bold rounded-md"
                                                        onClick={() => openEditDialog(student)}
                                                    >
                                                        <Pencil className="h-3 w-3" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 gap-1.5 text-xs font-bold rounded-md"
                                                        onClick={() => setLocation(`/classes/${classId}/marks`)}
                                                    >
                                                        <Trophy className="h-3 w-3" /> Marks
                                                    </Button>
                                                    {!isTechSupport && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 border-red-100 text-red-600 bg-red-50 hover:bg-red-100 gap-1.5 text-xs font-bold rounded-md"
                                                            onClick={() => {
                                                                if (window.confirm("Remove student from this class?")) {
                                                                    deleteStudentMutation.mutate(student.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" /> Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredStudents?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                                                No students found in this class.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* ID Generation Banner */}
                    {!students?.some((s: any) => s.studentId) && (students?.length || 0) > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-full">
                                    <Plus className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-amber-800 font-bold">Student IDs haven't been generated yet</p>
                                    <p className="text-amber-600 text-sm">Click the button to automatically assign IDs based on the subject name.</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => generateIdsMutation.mutate()}
                                disabled={generateIdsMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg h-9"
                            >
                                Generate IDs Now
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-[#4F46E5] p-6 text-white flex items-center gap-3">
                        <Plus className="h-6 w-6" />
                        <DialogTitle className="text-xl font-bold text-white">Enroll New Students</DialogTitle>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-500" />
                                Available Students
                            </h3>
                            <div className="relative">
                                <Input
                                    placeholder="Search students..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="pl-10 h-11 rounded-xl border-slate-200"
                                />
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                            </div>
                            <ScrollArea className="h-[250px] border rounded-2xl p-4 bg-slate-50/50">
                                <div className="space-y-2">
                                    {readyForClassLeads?.leads
                                        .filter((s: any) =>
                                            !students?.some(existing => existing.id === s.id) &&
                                            (s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                s.email?.toLowerCase().includes(studentSearch.toLowerCase()))
                                        )
                                        .map((student: any) => (
                                            <div
                                                key={student.id}
                                                className="flex items-center space-x-3 p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
                                                onClick={() => {
                                                    if (selectedStudentIds.includes(student.id)) {
                                                        setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                    } else {
                                                        setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                    }
                                                }}
                                            >
                                                <Checkbox
                                                    id={`student-${student.id}`}
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    className="rounded-md"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{student.name}</p>
                                                    <p className="text-xs text-slate-500">{student.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    {readyForClassLeads?.leads.filter((s: any) => !students?.some(existing => existing.id === s.id)).length === 0 && (
                                        <p className="text-center text-slate-400 py-8 text-sm italic">No students available for enrollment</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                {selectedStudentIds.length} selected
                            </p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setIsAddStudentOpen(false)} className="rounded-xl h-11 text-slate-500 hover:text-slate-900">
                                    Cancel
                                </Button>
                                <Button
                                    disabled={selectedStudentIds.length === 0 || addStudentsMutation.isPending}
                                    onClick={() => addStudentsMutation.mutate(selectedStudentIds)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 shadow-lg shadow-indigo-100"
                                >
                                    {addStudentsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Enroll Students
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Student Dialog */}
            <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
                <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-amber-500 p-6 text-white flex items-center gap-3">
                        <Pencil className="h-6 w-6" />
                        <DialogTitle className="text-xl font-bold text-white">Edit Student Details</DialogTitle>
                    </div>
                    <div className="p-8">
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
                                <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-bold">Full Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="rounded-xl border-slate-200 h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-bold">Email Address</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="email" className="rounded-xl border-slate-200 h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={editForm.control}
                                        name="studentId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-bold">Student ID</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="rounded-xl border-slate-200 h-11" placeholder="e.g. FSD-01" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editForm.control}
                                        name="joinedAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-bold">Joined Date</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="date" className="rounded-xl border-slate-200 h-11" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold"
                                        onClick={() => setEditingStudent(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                                        disabled={updateStudentMutation.isPending}
                                    >
                                        {updateStudentMutation.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </DialogContent>
            </Dialog>

            <footer className="fixed bottom-0 left-0 right-0 py-4 bg-slate-900 text-white text-center text-xs font-medium z-10">
                © {new Date().getFullYear()} Attendance Management System. All rights reserved.
            </footer>
        </>
    );
}
