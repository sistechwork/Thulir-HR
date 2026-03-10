import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Database, Calculator, Mail, Download, Layers, ShieldCheck, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function TechDocsPage() {
    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header Section */}
                    <div className="flex items-center gap-4 mb-12">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">System Documentation</h1>
                            <p className="text-slate-500 mt-1 text-lg">Detailed technical architecture and operational guide for Tech Support.</p>
                        </div>
                    </div>

                    {/* Section 1: Core System Architecture */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-sm">
                            <Layers className="h-4 w-4" />
                            <span>01 / Foundation</span>
                        </div>
                        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/70 backdrop-blur-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-2xl font-bold">Core System Architecture</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Database className="h-5 w-5 text-indigo-500" />
                                            <h3 className="font-bold text-slate-900">Database Engine</h3>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed text-sm">
                                            The system uses a relational structure. Each instructor (Mentor) manages multiple Classes, which in turn contain Students (Leads).
                                            Attendance and performance records are strictly linked to ensure data integrity and perfect organization.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Zap className="h-5 w-5 text-amber-500" />
                                            <h3 className="font-bold text-slate-900">Routing Logic</h3>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed text-sm">
                                            Acts as the "brain" of the app. It handles all incoming web requests, manages secure login sessions for tech support,
                                            and coordinates seamless data flow between the central database and the visual dashboard.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Section 2: Attendance Tracking */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 font-bold uppercase tracking-wider text-sm">
                            <Calculator className="h-4 w-4" />
                            <span>02 / Analytics</span>
                        </div>
                        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/70 backdrop-blur-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-2xl font-bold">How Attendance is Processed</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4 text-slate-600">
                                    <div className="flex gap-4 p-4 border-l-4 border-green-500 bg-green-50/50 rounded-r-2xl">
                                        <div className="font-bold text-green-700">Status Tracking:</div>
                                        <p className="text-sm">Records specific statuses (Present, Absent, Late) per student for each session day.</p>
                                    </div>
                                    <div className="flex gap-4 p-4 border-l-4 border-indigo-500 bg-indigo-50/50 rounded-r-2xl">
                                        <div className="font-bold text-indigo-700">Percentage Logic:</div>
                                        <p className="text-sm">Calculates attendance by counting "Present" markers and dividing them by the total number of held sessions.</p>
                                    </div>
                                    <div className="flex gap-4 p-4 border-l-4 border-slate-500 bg-slate-50/50 rounded-r-2xl">
                                        <div className="font-bold text-slate-700">Duplicate Prevention:</div>
                                        <p className="text-sm">Built-in safety checks prevent marking the same student twice for the same class on the same day.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Section 3: SMTP Module */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-sm">
                            <Mail className="h-4 w-4" />
                            <span>03 / Communications</span>
                        </div>
                        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/70 backdrop-blur-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-2xl font-bold">How Emails are Sent (SMTP Module)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-slate-600 leading-relaxed">
                                    The module handles all external communication using standard secure protocols:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <ShieldCheck className="h-6 w-6 text-indigo-600 mb-2" />
                                        <h4 className="font-bold text-slate-900 mb-1">Secure Tunneling</h4>
                                        <p className="text-xs text-slate-500">Uses TLS encryption for secure connections to email providers.</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <Zap className="h-6 w-6 text-amber-500 mb-2" />
                                        <h4 className="font-bold text-slate-900 mb-1">Automated Triggers</h4>
                                        <p className="text-xs text-slate-500">Absent markers immediately trigger professional notifications.</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="h-6 w-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs mb-2">MIME</div>
                                        <h4 className="font-bold text-slate-900 mb-1">Clean Formatting</h4>
                                        <p className="text-xs text-slate-500">Uses multi-part formatting for professional-looking inboxes.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Section 4 & 5: Data Management */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-wider text-sm">
                            <Download className="h-4 w-4" />
                            <span>04 / Data & Assets</span>
                        </div>
                        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/70 backdrop-blur-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-2xl font-bold">Export & Bulk Management</CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        Excel & CSV Export
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Builds portable files from scratch. Records are organized with students in rows and dates in columns, supporting color-coding and automatic calculations for attendance percentages and total marks.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        Bulk Import
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Processes uploaded Excel/CSV files by mapping local columns to system fields. Allows adding hundreds of students in seconds with built-in duplicate detection.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </main>
        </>
    );
}
