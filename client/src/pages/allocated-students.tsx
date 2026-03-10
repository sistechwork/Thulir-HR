import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search,
    Filter,
    Users,
    Edit,
    ArrowLeftRight,
    MoreVertical,
    Mail,
    Phone,
    GraduationCap
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LeadDetailsModal from "@/components/LeadDetailsModal";

export default function AllocatedStudentsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [batchFilter, setBatchFilter] = useState("all");

    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReassignDialog, setShowReassignDialog] = useState(false);
    const [showMappingEditDialog, setShowMappingEditDialog] = useState(false);
    const [targetClassId, setTargetClassId] = useState<string>("");

    const [emailFilter, setEmailFilter] = useState("");
    const [phoneFilter, setPhoneFilter] = useState("");

    const [editStudentId, setEditStudentId] = useState("");
    const [editJoinedAt, setEditJoinedAt] = useState("");

    // Fetch allocated students
    const { data: students, isLoading: studentsLoading, refetch } = useQuery<any[]>({
        queryKey: ["/api/students/allocated"],
        queryFn: async () => {
            const res = await fetch("/api/students/allocated");
            if (!res.ok) throw new Error("Failed to fetch allocated students");
            return res.json();
        }
    });

    // Fetch all classes for re-assignment
    const { data: classes } = useQuery<any[]>({
        queryKey: ["/api/all-classes"],
        queryFn: async () => {
            const res = await fetch("/api/all-classes");
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        }
    });

    // Re-assign mutation
    const reassignMutation = useMutation({
        mutationFn: async ({ leadId, oldClassId, newClassId }: any) => {
            const res = await apiRequest("PATCH", `/api/students/${leadId}/reassign`, {
                oldClassId,
                newClassId
            });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Student re-assigned successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/students/allocated"] });
            queryClient.invalidateQueries({ queryKey: ["/api/students/allocated/count"] });
            setShowReassignDialog(false);
            setSelectedStudent(null);
            setTargetClassId("");
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "Failed to re-assign student", variant: "destructive" });
        }
    });

    // Update Mapping mutation (ID & Date)
    const updateMappingMutation = useMutation({
        mutationFn: async ({ classId, leadId, studentId, joinedAt }: any) => {
            // Use the existing student-id update endpoint if only ID changed, 
            // but we might need a more general one. For now, let's use what we have or add one.
            const res = await apiRequest("PATCH", `/api/classes/${classId}/students/${leadId}/mapping`, {
                studentId,
                joinedAt
            });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Student mapping updated" });
            refetch();
            setShowMappingEditDialog(false);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const filteredStudents = students?.filter((s: any) => {
        const searchString = searchTerm.toLowerCase();
        const matchesSearch = s.name.toLowerCase().includes(searchString) || s.studentId?.toLowerCase().includes(searchString);

        const matchesEmail = !emailFilter || s.email.toLowerCase().includes(emailFilter.toLowerCase());
        const matchesPhone = !phoneFilter || s.phone?.includes(phoneFilter);
        const matchesBatch = batchFilter === "all" || s.classId?.toString() === batchFilter;

        return matchesSearch && matchesBatch && matchesEmail && matchesPhone;
    });

    const handleEdit = (student: any) => {
        setSelectedStudent(student);
        setShowEditModal(true);
    };

    const handleEditMapping = (student: any) => {
        setSelectedStudent(student);
        setEditStudentId(student.studentId || "");
        setEditJoinedAt(student.joinedAt ? new Date(student.joinedAt).toISOString().split('T')[0] : "");
        setShowMappingEditDialog(true);
    };

    const handleReassign = (student: any) => {
        setSelectedStudent(student);
        setShowReassignDialog(true);
    };

    const confirmReassign = () => {
        if (!targetClassId || !selectedStudent) return;
        reassignMutation.mutate({
            leadId: selectedStudent.id,
            oldClassId: selectedStudent.classId,
            newClassId: parseInt(targetClassId)
        });
    };

    const confirmMappingUpdate = () => {
        if (!selectedStudent) return;
        updateMappingMutation.mutate({
            classId: selectedStudent.classId,
            leadId: selectedStudent.id,
            studentId: editStudentId,
            joinedAt: editJoinedAt
        });
    };

    return (
        <>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="px-8 py-6 border-b bg-white/50 backdrop-blur-md">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            Allocated Students
                        </h1>
                        <p className="text-muted-foreground">Manage students assigned to batches and mentors</p>
                    </div>
                </header>

                <div className="p-8 border-b bg-white/30 backdrop-blur-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Name/ID..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Filter Email..."
                                value={emailFilter}
                                onChange={(e) => setEmailFilter(e.target.value)}
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Filter Phone..."
                                value={phoneFilter}
                                onChange={(e) => setPhoneFilter(e.target.value)}
                            />
                        </div>
                        <Select value={batchFilter} onValueChange={setBatchFilter}>
                            <SelectTrigger>
                                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                {classes?.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.name} ({c.subject})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <main className="p-8 flex-1 overflow-auto">
                    <Card>
                        <CardContent className="p-0">
                            {studentsLoading ? (
                                <div className="p-12 text-center text-muted-foreground animate-pulse">Loading students...</div>
                            ) : filteredStudents?.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground">No allocated students found matching filters.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Batch & Mentor</TableHead>
                                            <TableHead>Contacts</TableHead>
                                            <TableHead>Joined At</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents?.map((student: any) => (
                                            <TableRow key={`${student.id}-${student.classId}`}>
                                                <TableCell>
                                                    <div className="font-medium">{student.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                                                        {student.studentId || "PENDING"}
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium underline decoration-primary/20">{student.className}</span>
                                                        <span className="text-xs text-muted-foreground">{student.mentorEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs space-y-1">
                                                        <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {student.email}</div>
                                                        <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {student.phone}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {student.joinedAt ? new Date(student.joinedAt).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(student)}>Edit Profile</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEditMapping(student)}>Edit Student ID/Date</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleReassign(student)}>Change Batch</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>

            <Dialog open={showMappingEditDialog} onOpenChange={setShowMappingEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Student Allocation</DialogTitle>
                        <DialogDescription>Update ID and Joining Date for <strong>{selectedStudent?.name}</strong></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Student ID</label>
                            <Input value={editStudentId} onChange={(e) => setEditStudentId(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Joining Date</label>
                            <Input type="date" value={editJoinedAt} onChange={(e) => setEditJoinedAt(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMappingEditDialog(false)}>Cancel</Button>
                        <Button onClick={confirmMappingUpdate} disabled={updateMappingMutation.isPending}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Student Batch</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Target Batch</label>
                            <Select value={targetClassId} onValueChange={setTargetClassId}>
                                <SelectTrigger><SelectValue placeholder="Choose new batch..." /></SelectTrigger>
                                <SelectContent>
                                    {classes?.filter(c => c.id !== selectedStudent?.classId).map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.subject})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReassignDialog(false)}>Cancel</Button>
                        <Button onClick={confirmReassign} disabled={!targetClassId || reassignMutation.isPending}>Move Student</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showEditModal && selectedStudent && (
                <LeadDetailsModal
                    lead={selectedStudent}
                    isOpen={showEditModal}
                    onClose={() => { setShowEditModal(false); setSelectedStudent(null); }}
                    onUpdate={refetch}
                />
            )}
        </>
    );
}
