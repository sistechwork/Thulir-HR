import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Trophy,
    ArrowLeft,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2,
    RotateCcw,
    FileSpreadsheet,
    Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentMark {
    leadId: number;
    studentName: string;
    studentId: string;
    assessment1: number;
    assessment2: number;
    task: number;
    project: number;
    finalValidation: number;
    total: number;
}

export default function ClassMarksPage() {
    const [, params] = useRoute("/classes/:id/marks");
    const [, setLocation] = useLocation();
    const classId = parseInt(params?.id || "0");
    const { toast } = useToast();
    const [localMarks, setLocalMarks] = useState<Record<number, StudentMark>>({});
    const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
    const [showFloatingSave, setShowFloatingSave] = useState(false);

    const handleSaveSuccess = () => {
        setShowFloatingSave(true);
        setTimeout(() => setShowFloatingSave(false), 1000);
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

    // Fetch existing marks
    const { data: existingMarks, isLoading: isMarksLoading } = useQuery<any[]>({
        queryKey: [`/api/classes/${classId}/marks`],
        enabled: !!classId,
    });

    // Fetch attendance data for export
    const { data: attendanceData } = useQuery<any[]>({
        queryKey: [`/api/classes/${classId}/attendance`],
        enabled: !!classId,
    });

    // Initialize local marks from existing data
    useEffect(() => {
        if (students) {
            const marksMap: Record<number, StudentMark> = {};

            students.forEach(student => {
                const existing = existingMarks?.find(m => m.leadId === student.id);
                marksMap[student.id] = {
                    leadId: student.id,
                    studentName: student.name,
                    studentId: student.studentId || "PENDING",
                    assessment1: existing?.assessment1 || 0,
                    assessment2: existing?.assessment2 || 0,
                    task: existing?.task || 0,
                    project: existing?.project || 0,
                    finalValidation: existing?.finalValidation || 0,
                    total: existing?.total || 0,
                };
            });

            setLocalMarks(marksMap);
        }
    }, [students, existingMarks]);

    // Calculate total for a single student
    const calculateTotal = (mark: StudentMark): number => {
        return (mark.assessment1 || 0) +
            (mark.assessment2 || 0) +
            (mark.task || 0) +
            (mark.project || 0) +
            (mark.finalValidation || 0);
    };

    // Export to Excel
    const exportToExcel = () => {
        if (!students || students.length === 0) {
            toast({ title: "No Data", description: "No students to export", variant: "destructive" });
            return;
        }

        // Calculate attendance stats for each student
        const getAttendanceStats = (leadId: number) => {
            const studentAttendance = attendanceData?.filter(a => a.leadId === leadId) || [];
            const present = studentAttendance.filter(a => a.status === 'Present').length;
            const absent = studentAttendance.filter(a => a.status === 'Absent').length;
            const late = studentAttendance.filter(a => a.status === 'Late').length;
            const total = studentAttendance.length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            return { present, absent, late, percentage };
        };

        // Build export data
        const exportData = students.map((student, index) => {
            const mark = localMarks[student.id] || {
                assessment1: 0,
                assessment2: 0,
                task: 0,
                project: 0,
                finalValidation: 0,
                total: 0,
            };
            const attendance = getAttendanceStats(student.id);
            const today = new Date().toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });

            return {
                "S.No": index + 1,
                "Student ID": student.studentId || "PENDING",
                "Student Name": student.name,
                "Email": student.email || "",
                "Date": today,
                "Total Present": attendance.present,
                "Total Absent": attendance.absent,
                "Total Late": attendance.late,
                "Attendance %": attendance.percentage,
                "Assessment 1": mark.assessment1 || 0,
                "Assessment 2": mark.assessment2 || 0,
                "Task": mark.task || 0,
                "Project": mark.project || 0,
                "Final Validation": mark.finalValidation || 0,
                "Total Marks": mark.total || 0,
            };
        });

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Student Marks");

        // Auto-size columns
        const colWidths = [
            { wch: 6 },   // S.No
            { wch: 12 },  // Student ID
            { wch: 25 },  // Student Name
            { wch: 30 },  // Email
            { wch: 12 },  // Date
            { wch: 12 },  // Total Present
            { wch: 12 },  // Total Absent
            { wch: 10 },  // Total Late
            { wch: 12 },  // Attendance %
            { wch: 14 },  // Assessment 1
            { wch: 14 },  // Assessment 2
            { wch: 8 },   // Task
            { wch: 10 },  // Project
            { wch: 16 },  // Final Validation
            { wch: 12 },  // Total Marks
        ];
        ws['!cols'] = colWidths;

        // Export file
        const fileName = `${cls?.name || 'Class'}_Marks_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        toast({ title: "Exported!", description: `Data exported to ${fileName}` });
    };

    // Update a single field
    const updateField = (leadId: number, field: keyof StudentMark, value: number) => {
        const clampedValue = Math.min(10, Math.max(0, value));
        setLocalMarks(prev => {
            const updated = {
                ...prev,
                [leadId]: {
                    ...prev[leadId],
                    [field]: clampedValue,
                }
            };
            updated[leadId].total = calculateTotal(updated[leadId]);
            return updated;
        });
    };

    // Save single row mutation
    const saveRowMutation = useMutation({
        mutationFn: async (leadId: number) => {
            const mark = localMarks[leadId];
            await apiRequest("POST", `/api/classes/${classId}/marks`, {
                leadId: mark.leadId,
                assessment1: mark.assessment1,
                assessment2: mark.assessment2,
                task: mark.task,
                project: mark.project,
                finalValidation: mark.finalValidation,
            });
        },
        onSuccess: (_, leadId) => {
            setSavingRows(prev => {
                const next = new Set(prev);
                next.delete(leadId);
                return next;
                return next;
            });
            // toast({ title: "Saved", description: "Marks saved successfully" });
            handleSaveSuccess();
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/marks`] });
        },
        onError: (error: any, leadId) => {
            setSavingRows(prev => {
                const next = new Set(prev);
                next.delete(leadId);
                return next;
            });
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const saveRow = (leadId: number) => {
        setSavingRows(prev => new Set(prev).add(leadId));
        saveRowMutation.mutate(leadId);
    };

    // Save all mutation
    const saveAllMutation = useMutation({
        mutationFn: async () => {
            const marksArray = Object.values(localMarks).map(mark => ({
                leadId: mark.leadId,
                assessment1: mark.assessment1,
                assessment2: mark.assessment2,
                task: mark.task,
                project: mark.project,
                finalValidation: mark.finalValidation,
            }));
            await apiRequest("POST", `/api/classes/${classId}/marks/bulk`, { marks: marksArray });
        },
        onSuccess: () => {
            // toast({ title: "Success", description: "All marks saved successfully!" });
            handleSaveSuccess();
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/marks`] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Clear all marks
    const clearAll = () => {
        if (!window.confirm("Are you sure you want to clear all marks? This will reset all fields to 0.")) return;
        setLocalMarks(prev => {
            const cleared: Record<number, StudentMark> = {};
            Object.values(prev).forEach(mark => {
                cleared[mark.leadId] = {
                    ...mark,
                    assessment1: 0,
                    assessment2: 0,
                    task: 0,
                    project: 0,
                    finalValidation: 0,
                    total: 0,
                };
            });
            return cleared;
        });
    };

    const isLoading = isClassLoading || isStudentsLoading || isMarksLoading;

    if (isLoading) {
        return (
            <>
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </main>
            </>
        );
    }

    const sortedStudents = Object.values(localMarks).sort((a, b) =>
        a.studentName.localeCompare(b.studentName)
    );

    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/classes/${classId}/students`)}
                        className="text-slate-500 hover:text-slate-900 gap-2 px-0 hover:bg-transparent"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Students
                    </Button>

                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="cursor-pointer hover:text-indigo-600" onClick={() => setLocation("/classes")}>Classes</span>
                        <span>/</span>
                        <span className="cursor-pointer hover:text-indigo-600" onClick={() => setLocation(`/classes/${classId}/students`)}>{cls?.name}</span>
                        <span>/</span>
                        <span className="text-slate-400">Marks</span>
                    </nav>

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Trophy className="h-6 w-6 text-amber-600" />
                                </div>
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    Marks - {cls?.name}
                                </h1>
                            </div>
                            <p className="text-slate-500 ml-12 font-medium">
                                {cls?.subject || 'Class'} • Each assessment is out of 10 marks (Total: 50)
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-5 rounded-lg shadow-sm"
                                onClick={exportToExcel}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Excel
                            </Button>
                            <Button
                                variant="outline"
                                className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-10 px-5 rounded-lg bg-white"
                                onClick={() => setLocation(`/classes/${classId}/students`)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Students
                            </Button>
                        </div>
                    </div>

                    {/* Table Card */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                <CardTitle className="text-lg font-semibold text-slate-800">Student Marks</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="font-bold text-slate-600 px-6">Student</TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[100px]">
                                            <div className="text-xs">Assessment 1</div>
                                            <div className="text-xs text-slate-400">(0-10)</div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[100px]">
                                            <div className="text-xs">Assessment 2</div>
                                            <div className="text-xs text-slate-400">(0-10)</div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[100px]">
                                            <div className="text-xs">Task</div>
                                            <div className="text-xs text-slate-400">(0-10)</div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[100px]">
                                            <div className="text-xs">Project</div>
                                            <div className="text-xs text-slate-400">(0-10)</div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[100px]">
                                            <div className="text-xs">Final Validation</div>
                                            <div className="text-xs text-slate-400">(0-10)</div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[80px]">
                                            <div className="text-xs">Total</div>
                                            <div className="text-xs text-slate-400">(0-50)</div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-600 text-center w-[80px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((mark) => (
                                        <TableRow key={mark.leadId} className="hover:bg-slate-50/30 transition-colors border-slate-100">
                                            <TableCell className="px-6">
                                                <div className="font-bold text-slate-800">{mark.studentName}</div>
                                                <div className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">
                                                    {mark.studentId}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    value={mark.assessment1 || ""}
                                                    onChange={(e) => updateField(mark.leadId, "assessment1", parseInt(e.target.value) || 0)}
                                                    className="w-16 h-9 text-center mx-auto rounded-lg border-slate-200"
                                                    placeholder="0-10"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    value={mark.assessment2 || ""}
                                                    onChange={(e) => updateField(mark.leadId, "assessment2", parseInt(e.target.value) || 0)}
                                                    className="w-16 h-9 text-center mx-auto rounded-lg border-slate-200"
                                                    placeholder="0-10"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    value={mark.task || ""}
                                                    onChange={(e) => updateField(mark.leadId, "task", parseInt(e.target.value) || 0)}
                                                    className="w-16 h-9 text-center mx-auto rounded-lg border-slate-200"
                                                    placeholder="0-10"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    value={mark.project || ""}
                                                    onChange={(e) => updateField(mark.leadId, "project", parseInt(e.target.value) || 0)}
                                                    className="w-16 h-9 text-center mx-auto rounded-lg border-slate-200"
                                                    placeholder="0-10"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    value={mark.finalValidation || ""}
                                                    onChange={(e) => updateField(mark.leadId, "finalValidation", parseInt(e.target.value) || 0)}
                                                    className="w-16 h-9 text-center mx-auto rounded-lg border-slate-200"
                                                    placeholder="0-10"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold text-sm ${mark.total >= 40 ? 'bg-emerald-100 text-emerald-700' :
                                                    mark.total >= 25 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {mark.total}/50
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-1.5 text-xs font-bold rounded-md"
                                                    onClick={() => saveRow(mark.leadId)}
                                                    disabled={savingRows.has(mark.leadId)}
                                                >
                                                    {savingRows.has(mark.leadId) ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    )}
                                                    Save
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedStudents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">
                                                No students found in this class.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center py-4 border-t border-slate-100 bg-white rounded-2xl px-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <AlertCircle className="h-4 w-4" />
                            Leave fields empty for incomplete assessments. Each field accepts values from 0 to 10.
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-10 px-5 rounded-lg"
                                onClick={clearAll}
                            >
                                <RotateCcw className="h-4 w-4" />
                                Clear All
                            </Button>
                            <Button
                                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white gap-2 h-10 px-6 rounded-lg shadow-lg shadow-indigo-100"
                                onClick={() => saveAllMutation.mutate()}
                                disabled={saveAllMutation.isPending}
                            >
                                {saveAllMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save All Marks
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Save Notification */}
            {showFloatingSave && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-emerald-600 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved Successfully
                    </div>
                </div>
            )}
        </>
    );
}
