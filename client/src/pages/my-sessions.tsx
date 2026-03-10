import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    UserCheck,
    Search,
    Filter,
    Clock,
    Phone,
    Mail,
    MapPin,
    Edit,
    Save,
    X,
    Trash2,
    Plus,
    ChevronDown,
    ChevronUp,
    Calendar,
    CalendarCheck,
    User,
    Building2,
    Share2,
    GraduationCap,
    Timer,
    BookCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertLeadSchema } from "@shared/schema";
import Sidebar from "@/components/Sidebar";
import FloatingChatbot from "@/components/FloatingChatbot";
import { getAdminSubRole, isSessionOrganizer } from "@/lib/adminRoleUtils";

// User type for auth
interface AuthUser {
    id: string;
    email: string;
    role: 'hr' | 'accounts' | 'manager' | 'admin' | 'team_lead' | 'tech-support' | 'session-coordinator' | 'session_organizer';
    firstName?: string;
    lastName?: string;
    fullName?: string;
    role_id?: string;
}

// Edit lead form schema
const editLeadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    location: z.string().optional(),
    degree: z.string().optional(),
    domain: z.string().optional(),
    sessionDays: z
        .enum(["M,W,F", "T,T,S", "daily", "weekend", "custom"])
        .optional()
        .or(z.literal("")),
    walkinDate: z.string().optional().or(z.literal("")),
    walkinTime: z.string().optional().or(z.literal("")),
    timing: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    changeReason: z.string().optional(),
    yearOfPassing: z.string().optional(),
    collegeName: z.string().optional(),
    registrationAmount: z.string().optional(),
    pendingAmount: z.string().optional(),
    partialAmount: z.string().optional(),
    transactionNumber: z.string().optional(),
    concession: z.string().optional(),
});

type EditLeadForm = z.infer<typeof editLeadSchema>;

export default function MySessionsPage() {
    const { user: authUser } = useAuth();
    const user = authUser as AuthUser | undefined;
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("scheduled");
    const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
    const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "scheduled":
                return "status-scheduled";
            case "completed":
                return "status-completed";
            case "ready_for_class":
                return "status-ready-for-class";
            default:
                return "status-new";
        }
    };

    const isSessOrg = isSessionOrganizer(user?.role);
    const currentAdminSubRole = getAdminSubRole();

    const { data, isLoading, error } = useQuery({
        queryKey: ["/api/my/leads", "scheduled", user?.role, currentAdminSubRole],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append("status", "scheduled");
            if (currentAdminSubRole) {
                params.append("adminSubRole", currentAdminSubRole);
            }
            params.append("_t", Date.now().toString());
            const url = `/api/my/leads?${params.toString()}`;
            const response = await fetch(url, { credentials: "include" });
            if (!response.ok) throw new Error("Failed to fetch sessions");
            return response.json();
        },
        retry: false,
        staleTime: 0,
        enabled: !!user,
    });

    const createClassMutation = useMutation({
        mutationFn: async (leadId: number) => {
            const response = await apiRequest("PUT", `/api/leads/${leadId}`, {
                status: "completed",
                changeReason: "Class created"
            });
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: "Class Created",
                description: "The class has been successfully created and the lead is marked as completed.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
            queryClient.invalidateQueries({ queryKey: ["/api/my/completed"] });
        },
    });

    const updateLeadMutation = useMutation({
        mutationFn: async ({
            leadId,
            data,
        }: {
            leadId: number;
            data: EditLeadForm;
        }) => {
            const response = await apiRequest("PUT", `/api/leads/${leadId}`, data);
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: "Session Updated",
                description: "Session details have been saved successfully.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
            setEditingLeadId(null);
        },
    });

    const form = useForm<EditLeadForm>({
        resolver: zodResolver(editLeadSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            location: "",
            degree: "",
            domain: "",
            sessionDays: "",
            walkinDate: "",
            walkinTime: "",
            timing: "",
            status: "scheduled",
            notes: "",
            yearOfPassing: "",
            collegeName: "",
        },
    });

    const handleEditLead = (lead: any) => {
        setEditingLeadId(lead.id);
        form.reset({
            name: lead.name ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            location: lead.location ?? "",
            degree: lead.degree ?? "",
            domain: lead.domain ?? "",
            sessionDays: lead.sessionDays ?? "",
            walkinDate: lead.walkinDate ?? "",
            walkinTime: lead.walkinTime ?? "",
            timing: lead.timing ?? "",
            status: lead.status ?? "",
            notes: lead.notes ?? "",
            yearOfPassing: lead.yearOfPassing ?? "",
            collegeName: lead.collegeName ?? "",
            registrationAmount: lead.registrationAmount ?? "",
            pendingAmount: lead.pendingAmount ?? "",
            partialAmount: lead.partialAmount ?? "",
            transactionNumber: lead.transactionNumber ?? "",
            concession: lead.concession ?? "",
        });
    };

    const leads = (data as any)?.leads || [];
    const filteredLeads = leads.filter((lead: any) => {
        const matchesSearch =
            !searchTerm ||
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm);
        return matchesSearch && lead.status === "scheduled";
    });

    if (isLoading) {
        return (
            <>
                <div className="flex-1 flex flex-col p-6">
                    <p>Loading sessions...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <BookCheck className="w-8 h-8 text-primary" />
                                <div>
                                    <h1 className="text-3xl font-bold">My Sessions</h1>
                                    <p className="text-muted-foreground">
                                        {filteredLeads.length} active session{filteredLeads.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search sessions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {filteredLeads.map((lead: any) => (
                                <Card key={lead.id} className="shadow-green-md hover:shadow-green-bright transition-shadow">
                                    <CardHeader className="pb-3 px-6 pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <CardTitle className="text-lg">{lead.name}</CardTitle>
                                                <CardDescription>{lead.email} • {lead.phone}</CardDescription>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge className={`status-badge ${getStatusColor(lead.status)}`}>
                                                    {lead.status.replace("_", " ")}
                                                </Badge>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditLead(lead)}
                                                >
                                                    <Edit className="w-3 h-3 mr-1" /> Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-primary hover:bg-primary/90"
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to create a class for ${lead.name}?`)) {
                                                            createClassMutation.mutate(lead.id);
                                                        }
                                                    }}
                                                    disabled={createClassMutation.isPending}
                                                >
                                                    <BookCheck className="w-3 h-3 mr-1" /> Create Class
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-6 pb-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                                            <div className="flex items-center space-x-2">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <span>{lead.location || "No location"}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span>{lead.sessionDays} • {lead.timing}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredLeads.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground">No sessions found matching your criteria.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <Dialog open={editingLeadId !== null} onOpenChange={(open) => !open && setEditingLeadId(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Session</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => updateLeadMutation.mutate({ leadId: editingLeadId!, data }))} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setEditingLeadId(null)}>Cancel</Button>
                                <Button type="submit" disabled={updateLeadMutation.isPending}>
                                    {updateLeadMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
