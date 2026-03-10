import { useQuery, useMutation } from "@tanstack/react-query";
import { Class, InsertClass, insertClassSchema, Lead } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Layout, Calendar, MoreVertical, Pencil, Trash2, ArrowLeft, CheckCircle2, Award, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type ClassWithCount = Class & { studentCount: number };

const classFormSchema = insertClassSchema.omit({ instructorId: true });
type ClassFormValues = z.infer<typeof classFormSchema>;

export default function MyClassesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    // Determine if user is tech-support to show only mentor classes
    const isTechSupport = (user as any)?.role === 'tech-support';

    const { data: classesList, isLoading } = useQuery<ClassWithCount[]>({
        queryKey: [isTechSupport ? "/api/classes/my-mentor" : "/api/classes/with-counts", { instructorId: user?.id }],
        queryFn: async () => {
            const endpoint = isTechSupport ? "/api/classes/my-mentor" : "/api/classes/with-counts";
            const res = await apiRequest("GET", endpoint);
            return res.json();
        },
        enabled: !!user,
    });

    // Fetch tech-support users for mentor dropdown
    const { data: techSupportUsers } = useQuery<{ id: string; email: string; fullName: string }[]>({
        queryKey: ["/api/users/tech-support"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/users/tech-support");
            return res.json();
        },
        enabled: isCreateModalOpen,
    });

    // Fetch ready-for-class leads for adding to classes
    const { data: readyForClassLeads } = useQuery<{ leads: Lead[] }>({
        queryKey: ["/api/leads/ready-for-class", studentSearch, selectedClassId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (studentSearch) params.append("search", studentSearch);
            if (selectedClassId) params.append("classId", selectedClassId.toString());
            const res = await apiRequest("GET", `/api/leads/ready-for-class?${params}`);
            return res.json();
        },
        enabled: isStudentModalOpen && !!selectedClassId,
    });

    // Fetch students currently in the class
    const { data: currentStudents, isLoading: isLoadingStudents } = useQuery<Lead[]>({
        queryKey: ["/api/classes", selectedClassId, "students"],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/classes/${selectedClassId}/students`);
            return res.json();
        },
        enabled: isStudentModalOpen && !!selectedClassId,
    });

    const form = useForm<ClassFormValues>({
        resolver: zodResolver(classFormSchema),
        defaultValues: {
            name: "",
            subject: "",
            mentorEmail: "",
            mode: "",
        },
    });

    const addStudentsMutation = useMutation({
        mutationFn: async ({ classId, leadIds }: { classId: number; leadIds: number[] }) => {
            await apiRequest("POST", `/api/classes/${classId}/students`, { leadIds });
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Students added to class" });
            queryClient.invalidateQueries({ queryKey: ["/api/classes/with-counts"] });
            setIsStudentModalOpen(false);
            setSelectedStudentIds([]);
        },
    });

    const removeStudentMutation = useMutation({
        mutationFn: async ({ classId, leadId }: { classId: number; leadId: number }) => {
            await apiRequest("DELETE", `/api/classes/${classId}/students/${leadId}`);
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Student removed from class" });
            queryClient.invalidateQueries({ queryKey: ["/api/classes", selectedClassId, "students"] });
            queryClient.invalidateQueries({ queryKey: ["/api/classes/with-counts"] });
            queryClient.invalidateQueries({ queryKey: ["/api/leads/ready-for-class"] });
        },
    });

    const onSubmit = (data: ClassFormValues) => {
        createClassMutation.mutate(data as any);
    };


    const createClassMutation = useMutation({
        mutationFn: async (data: InsertClass) => {
            console.log("Sending class creation request:", data);
            const response = await apiRequest("POST", "/api/classes", data);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Class creation failed:", errorData);
                throw new Error(errorData.message || "Failed to create class");
            }
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Class created successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/classes/with-counts"] });
            setIsCreateModalOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            console.error("Class creation mutation error:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to create class. Please try again.",
            });
        },
    });


    const deleteClassMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/classes/${id}`);
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Class deleted successfully",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/classes/with-counts"] });
        },
    });


    if (isLoading) {
        return (
            <>
                <main className="flex-1 p-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-48 bg-gray-200 rounded"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-48 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/")}
                        className="bg-white hover:bg-slate-50 text-slate-600 border-slate-200 gap-2 rounded-lg"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                                <Layout className="h-8 w-8 text-slate-700" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900">
                                My Classes
                            </h1>
                        </div>
                        {!isTechSupport && (
                            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white gap-2 h-11 px-8 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95">
                                        <Plus className="h-5 w-5" />
                                        Add Class
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                                    <div className="bg-[#4F46E5] p-6 text-white flex items-center gap-3">
                                        <Plus className="h-6 w-6" />
                                        <DialogTitle className="text-xl font-bold text-white">Add New Class</DialogTitle>
                                    </div>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-600 font-semibold">Class Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Computer Science 101" {...field} className="rounded-xl h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="subject"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-600 font-semibold">Subject</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g., Computer Science"
                                                                {...field}
                                                                className="rounded-xl h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                                                value={field.value || ""}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="mentorEmail"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-600 font-semibold">Mentor (Tech Support)</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                                            <FormControl>
                                                                <SelectTrigger className="rounded-xl h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                                                    <SelectValue placeholder="Select a tech support mentor" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {techSupportUsers && techSupportUsers.length > 0 ? (
                                                                    techSupportUsers.map((user) => (
                                                                        <SelectItem key={user.id} value={user.email}>
                                                                            {user.fullName} ({user.email})
                                                                        </SelectItem>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-2 text-sm text-slate-500 text-center">
                                                                        No tech support users available
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="mode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-600 font-semibold">Mode</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                                            <FormControl>
                                                                <SelectTrigger className="rounded-xl h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                                                                    <SelectValue placeholder="Select class mode" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="online">Online</SelectItem>
                                                                <SelectItem value="offline">Offline</SelectItem>
                                                                <SelectItem value="hybrid">Hybrid</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex gap-4 pt-4">
                                                <Button
                                                    variant="secondary"
                                                    type="button"
                                                    onClick={() => setIsCreateModalOpen(false)}
                                                    className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 h-12 rounded-xl font-semibold"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={createClassMutation.isPending}
                                                    className="flex-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white h-12 rounded-xl font-semibold px-8 gap-2"
                                                >
                                                    {createClassMutation.isPending ? "Adding..." : <><CheckCircle2 className="h-4 w-4" /> Add Class</>}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {classesList?.map((cls) => (
                            <Card key={cls.id} className="group hover:shadow-2xl transition-all duration-500 border-slate-200 rounded-[2rem] overflow-hidden bg-white">
                                <CardHeader className="pb-6 relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <CardTitle className="text-2xl font-bold text-slate-900 mb-1">
                                                {cls.name}
                                            </CardTitle>
                                            <CardDescription className="text-lg font-medium text-slate-500 uppercase tracking-wide">
                                                {cls.subject || "N/A"}
                                            </CardDescription>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-50 rounded-full">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 p-2 min-w-[160px] shadow-xl">
                                                <DropdownMenuItem className="text-slate-600 gap-3 cursor-pointer rounded-xl h-11" onClick={() => {
                                                    setLocation(`/classes/${cls.id}/students`);
                                                }}>
                                                    <Users className="h-4 w-4" /> Students List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-slate-600 gap-3 cursor-pointer rounded-xl h-11">
                                                    <Pencil className="h-4 w-4" /> Edit Class
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-500 gap-3 cursor-pointer focus:text-red-600 focus:bg-red-50 rounded-xl h-11"
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to delete this class?")) {
                                                            deleteClassMutation.mutate(cls.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" /> Delete Class
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Users className="h-5 w-5 text-slate-400" />
                                            <span className="font-semibold">{cls.studentCount} students</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="h-5 w-5 text-slate-400" />
                                            <span>Created: {cls.createdAt ? format(new Date(cls.createdAt), "MMM d, yyyy") : "N/A"}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-xl h-11 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 gap-2"
                                            onClick={() => {
                                                setLocation(`/classes/${cls.id}/students`);
                                            }}
                                        >
                                            <Users className="h-4 w-4" /> Students
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-xl h-11 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 gap-2"
                                            onClick={() => setLocation(`/classes/${cls.id}/attendance`)}
                                        >
                                            <CheckCircle2 className="h-4 w-4" /> Attendance
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-xl h-11 border-amber-400/30 text-amber-600 hover:bg-amber-50 gap-2"
                                            onClick={() => setLocation(`/classes/${cls.id}/marks`)}
                                        >
                                            <Award className="h-4 w-4" /> Mark
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-xl h-11 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                                            onClick={() => {
                                                if (window.confirm("Are you sure?")) deleteClassMutation.mutate(cls.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" /> Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {classesList?.length === 0 && (
                            <div className="col-span-full py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <Layout className="h-12 w-12 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">No classes found</h3>
                                <p className="text-slate-500 mt-2 max-w-sm text-lg">
                                    Click "Add Class" to start managing your students and attendance.
                                </p>
                                <Button
                                    className="mt-8 bg-[#4F46E5] hover:bg-[#4338CA] px-8 py-6 text-lg rounded-2xl h-auto"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    Create your first class
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-3xl p-0 overflow-hidden">
                    <div className="bg-[#4F46E5] p-6 text-white">
                        <DialogTitle className="text-xl font-bold text-white">Add Students to Class</DialogTitle>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Currently Assigned Students Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-500" />
                                Currently Assigned ({currentStudents?.length || 0})
                            </h3>
                            <ScrollArea className="h-[180px] border rounded-2xl p-4 bg-slate-50/50">
                                <div className="space-y-3">
                                    {currentStudents?.map((student) => (
                                        <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100 group">
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900">{student.name}</p>
                                                <p className="text-xs text-slate-500">{student.email}</p>
                                            </div>
                                            {!isTechSupport && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg group-hover:opacity-100 transition-all"
                                                    onClick={() => {
                                                        if (window.confirm(`Remove ${student.name} from this class?`)) {
                                                            removeStudentMutation.mutate({
                                                                classId: selectedClassId!,
                                                                leadId: student.id
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {(!currentStudents || currentStudents.length === 0) && (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                                            <Users className="h-8 w-8 mb-2 opacity-20" />
                                            <p className="text-sm">No students assigned yet</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Add Students Section - Only for Admin/SessOrg */}
                        {!isTechSupport && (
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-green-500" />
                                    Add New Students
                                </h3>
                                <div className="relative">
                                    <Input
                                        placeholder="Search students ready for class..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-slate-200"
                                    />
                                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                </div>
                                <ScrollArea className="h-[200px] border rounded-2xl p-4 bg-white">
                                    <div className="space-y-2">
                                        {readyForClassLeads?.leads.map((student) => (
                                            <div key={student.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
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
                                                    <p className="text-xs text-slate-500">{student.email} • {student.phone}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!readyForClassLeads?.leads || readyForClassLeads.leads.length === 0) && (
                                            <p className="text-center text-slate-400 py-8 text-sm italic">No students ready for class</p>
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="flex justify-between items-center pt-2">
                                    <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                        {selectedStudentIds.length} selected
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsStudentModalOpen(false)} className="rounded-xl h-10">
                                            Close
                                        </Button>
                                        <Button
                                            disabled={selectedStudentIds.length === 0 || addStudentsMutation.isPending}
                                            onClick={() => {
                                                if (selectedClassId) {
                                                    addStudentsMutation.mutate({
                                                        classId: selectedClassId,
                                                        leadIds: selectedStudentIds
                                                    });
                                                }
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6"
                                        >
                                            {addStudentsMutation.isPending ? "Adding..." : "Add to Class"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isTechSupport && (
                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <Button variant="outline" onClick={() => setIsStudentModalOpen(false)} className="rounded-xl h-10">
                                    Close
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}