import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Users,
    CheckCircle2,
    Clock,
    TrendingUp,
    User,
    Mail,
    Phone,
    MapPin
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TeamMember = {
    id: string;
    name: string;
    email: string;
    totalLeads: number;
    completedLeads: number;
    pendingLeads: number;
    completionRate: number;
};

type TeamLead = {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    assignedTo: string;
    assignedToId: string;
    createdAt: string;
    walkinDate: string;
    location: string;
};

type DashboardData = {
    teamLeadName: string;
    teamName: string;
    totalMembers: number;
    totalLeads: number;
    completedLeads: number;
    completionRate: number;
    teamMembers: TeamMember[];
    allLeads: TeamLead[];
};

export default function TeamLeadDashboard() {
    const [selectedMember, setSelectedMember] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['/api/team-lead/dashboard'],
        queryFn: async () => {
            const response = await fetch('/api/team-lead/dashboard', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            return response.json();
        }
    });

    // Filter leads based on selected member, status, and search
    const filteredLeads = data?.allLeads.filter(lead => {
        const matchesMember = selectedMember === 'all' || lead.assignedToId === selectedMember;
        const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
        const matchesSearch = !searchQuery ||
            lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phone?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesMember && matchesStatus && matchesSearch;
    }) || [];

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
            case 'ready_for_class':
                return 'bg-green-500';
            case 'accounts_pending':
                return 'bg-blue-500';
            case 'new':
                return 'bg-purple-500';
            case 'scheduled':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    if (error) {
        return (
            <>
                <main className="flex-1 overflow-auto">
                    <div className="text-center py-12">
                        <h2 className="text-xl font-semibold text-red-600">Error Loading Dashboard</h2>
                        <p className="text-muted-foreground">{(error as Error).message}</p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Users className="h-8 w-8 text-primary" />
                            My Team Lead Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            {data?.teamName ? `${data.teamName} - ` : ''}Monitor your team's performance and view all leads
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-4">
                                {[1, 2, 3, 4].map(i => (
                                    <Skeleton key={i} className="h-32 w-full" />
                                ))}
                            </div>
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-96 w-full" />
                        </div>
                    ) : (
                        <>
                            {/* Overview Cards */}
                            <div className="grid gap-4 md:grid-cols-4 mb-8">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                                        <Users className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data?.totalMembers || 0}</div>
                                        <p className="text-xs text-muted-foreground">HR personnel</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                                        <Clock className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data?.totalLeads || 0}</div>
                                        <p className="text-xs text-muted-foreground">All leads</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data?.completedLeads || 0}</div>
                                        <p className="text-xs text-muted-foreground">Finished leads</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data?.completionRate || 0}%</div>
                                        <p className="text-xs text-muted-foreground">Team average</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Team Members Table */}
                            <Card className="mb-8">
                                <CardHeader>
                                    <CardTitle>Team Members Performance</CardTitle>
                                    <CardDescription>Individual statistics for all team members</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead className="text-center">Total Leads</TableHead>
                                                <TableHead className="text-center">Completed</TableHead>
                                                <TableHead className="text-center">Pending</TableHead>
                                                <TableHead className="text-center">Completion Rate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data?.teamMembers && data.teamMembers.length > 0 ? (
                                                data.teamMembers.map((member) => (
                                                    <TableRow key={member.id}>
                                                        <TableCell className="font-medium">{member.name}</TableCell>
                                                        <TableCell>{member.email}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{member.totalLeads}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className="bg-green-500">{member.completedLeads}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="secondary">{member.pendingLeads}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`text-lg font-bold ${member.completionRate >= 80 ? 'text-green-600' :
                                                                member.completionRate >= 50 ? 'text-yellow-600' :
                                                                    'text-red-600'
                                                                }`}>
                                                                {member.completionRate}%
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                        No team members found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* All Team Leads Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>All Team Leads</CardTitle>
                                    <CardDescription>Complete list of leads assigned to your team</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Filters */}
                                    <div className="flex gap-4 mb-6">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Search by name, email, or phone..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter by member" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Members</SelectItem>
                                                {data?.teamMembers.map((member) => (
                                                    <SelectItem key={member.id} value={member.id}>
                                                        {member.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter by status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="new">New</SelectItem>
                                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="ready_for_class">Ready for Class</SelectItem>
                                                <SelectItem value="accounts_pending">Accounts Pending</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Leads Table */}
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Phone</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Assigned To</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Walk-in Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredLeads.length > 0 ? (
                                                    filteredLeads.map((lead) => (
                                                        <TableRow key={lead.id}>
                                                            <TableCell className="font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                                    {lead.name || 'N/A'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                                    {lead.email || 'N/A'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                                    {lead.phone || 'N/A'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                                    {lead.location || 'N/A'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{lead.assignedTo}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusColor(lead.status)}>
                                                                    {formatStatus(lead.status)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {lead.walkinDate ? new Date(lead.walkinDate).toLocaleDateString() : 'N/A'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                            No leads found matching your filters
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Results count */}
                                    <div className="mt-4 text-sm text-muted-foreground">
                                        Showing {filteredLeads.length} of {data?.allLeads.length || 0} leads
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
