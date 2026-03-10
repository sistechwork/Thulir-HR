import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    ChevronLeft,
    Calendar,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Save,
    RefreshCcw,
    UserCircle,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Sidebar from "@/components/Sidebar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Student {
    id: number;
    name: string;
    email: string;
}

interface AttendanceRecord {
    leadId: number;
    status: string;
    date: string;
    studentId?: string;
}

export default function ClassAttendancePage() {
    const { id: classId } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [attendanceMap, setAttendanceMap] = useState<Record<number, string>>({});
    const [showFloatingSave, setShowFloatingSave] = useState(false);

    // Fetch Class Info
    const { data: cls } = useQuery<any>({
        queryKey: [`/api/classes/${classId}`],
    });

    // Fetch Students in this class
    const { data: students } = useQuery<any[]>({
        queryKey: [`/api/classes/${classId}/students`],
    });

    // Fetch existing attendance for the selected date
    const { data: existingAttendance } = useQuery<AttendanceRecord[]>({
        queryKey: [`/api/classes/${classId}/attendance`, { date: selectedDate }],
        enabled: !!selectedDate,
    });

    // Update attendanceMap when data changes
    useEffect(() => {
        if (students) {
            const initialMap: Record<number, string> = {};
            students.forEach(s => {
                const existing = existingAttendance?.find(a => a.leadId === s.id);
                // If no existing record, leave empty (unselected) until user marks attendance
                initialMap[s.id] = existing?.status || "";
            });
            setAttendanceMap(initialMap);
        }
    }, [students, existingAttendance]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const attendanceList = Object.entries(attendanceMap).map(([leadId, status]) => ({
                leadId: parseInt(leadId),
                status,
                date: selectedDate
            }));
            await apiRequest("POST", `/api/classes/${classId}/attendance/bulk`, { attendance: attendanceList });
        },
        onSuccess: () => {
            setShowFloatingSave(true);
            setTimeout(() => setShowFloatingSave(false), 1000);
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/attendance`] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to save attendance",
                variant: "destructive"
            });
        }
    });

    const handleStatusChange = (leadId: number, status: string) => {
        setAttendanceMap(prev => ({ ...prev, [leadId]: status }));
    };

    const markAll = (status: string) => {
        if (!students) return;
        const newMap = { ...attendanceMap };
        students.forEach(s => {
            newMap[s.id] = status;
        });
        setAttendanceMap(newMap);
    };

    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <Button
                            variant="ghost"
                            className="w-fit gap-2 text-slate-500 hover:text-slate-900 -ml-2 rounded-xl"
                            onClick={() => setLocation("/classes")}
                        >
                            <ChevronLeft className="h-4 w-4" /> Back to Classes
                        </Button>

                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mark Attendance</h1>
                                <p className="text-slate-500 font-medium">Record daily attendance for {cls?.name || "Class"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Card */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white/70 backdrop-blur-xl border border-white/20">
                        <CardHeader className="border-b border-slate-100/50 p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold text-slate-800">
                                        Attendance for {format(new Date(selectedDate), "MMMM dd, yyyy")}
                                    </CardTitle>
                                    <p className="text-slate-400 text-sm font-medium">Select a date and record student attendance status</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="pl-10 h-12 w-[200px] rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium text-slate-700"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2 px-5 font-semibold"
                                    >
                                        <ArrowRight className="h-4 w-4" /> Change Date
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                                        <TableHead className="w-[120px] font-bold text-slate-500 px-8 py-5">Student ID</TableHead>
                                        <TableHead className="font-bold text-slate-500">Name</TableHead>
                                        <TableHead className="font-bold text-slate-500">Email</TableHead>
                                        <TableHead className="text-center font-bold text-slate-500">Present</TableHead>
                                        <TableHead className="text-center font-bold text-slate-500">Absent</TableHead>
                                        <TableHead className="text-center font-bold text-slate-500">Late</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students?.map((student, idx) => (
                                        <TableRow key={student.id} className="group hover:bg-slate-50/30 transition-colors border-slate-100">
                                            <TableCell className="px-8 font-semibold text-slate-400">
                                                {student.studentId || idx + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                                        {student.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 font-medium">
                                                {student.email}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <button
                                                    onClick={() => handleStatusChange(student.id, "Present")}
                                                    className={`h-6 w-6 rounded-full border-2 transition-all ${attendanceMap[student.id] === "Present"
                                                        ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200 scale-110"
                                                        : "border-slate-300 hover:border-emerald-300"
                                                        }`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <button
                                                    onClick={() => handleStatusChange(student.id, "Absent")}
                                                    className={`h-6 w-6 rounded-full border-2 transition-all ${attendanceMap[student.id] === "Absent"
                                                        ? "bg-rose-500 border-rose-500 shadow-lg shadow-rose-200 scale-110"
                                                        : "border-slate-300 hover:border-rose-300"
                                                        }`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <button
                                                    onClick={() => handleStatusChange(student.id, "Late")}
                                                    className={`h-6 w-6 rounded-full border-2 transition-all ${attendanceMap[student.id] === "Late"
                                                        ? "bg-amber-500 border-amber-500 shadow-lg shadow-amber-200 scale-110"
                                                        : "border-slate-300 hover:border-amber-300"
                                                        }`}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {students?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                    <Users className="h-8 w-8 opacity-20" />
                                                    <p className="font-medium">No students enrolled in this class yet.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => markAll("Present")}
                                    className="h-11 rounded-xl bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50 gap-2 px-6 font-semibold shadow-sm"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Mark All Present
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => markAll("Absent")}
                                    className="h-11 rounded-xl bg-white border-rose-100 text-rose-600 hover:bg-rose-50 gap-2 px-6 font-semibold shadow-sm"
                                >
                                    <XCircle className="h-4 w-4" /> Mark All Absent
                                </Button>
                            </div>

                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                                className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px] gap-2 font-bold shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                            >
                                {saveMutation.isPending ? (
                                    <RefreshCcw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {saveMutation.isPending ? "Saving..." : "Save Attendance"}
                            </Button>
                        </div>
                    </Card>

                    {/* Footer Info */}
                    <div className="flex justify-center pt-8 border-t border-slate-200/50">
                        <p className="text-slate-400 text-sm font-medium">
                            © 2025 Attendance Management System. All rights reserved.
                        </p>
                    </div>
                </div>
            </main>

            {/* Floating Save Notification */}
            {showFloatingSave && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-emerald-600 text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border border-emerald-500/50 backdrop-blur-md">
                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        Attendance Saved Successfully
                    </div>
                </div>
            )}
        </>
    );
}
