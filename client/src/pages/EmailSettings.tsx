import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
    Mail,
    Settings,
    CheckCircle2,
    ArrowLeft,
    Send,
    ShieldCheck,
    Server,
    Hash,
    Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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

const emailConfigSchema = z.object({
    smtpEmail: z.string().email("Valid email is required"),
    appPassword: z.string().min(1, "App password is required"),
    smtpServer: z.string().min(1, "SMTP server is required")
        .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^(\d{1,3}\.){3}\d{1,3}$/,
            "Must be a valid hostname or IP address"),
    smtpPort: z.coerce.number().int().refine(
        (port) => [25, 465, 587, 2525].includes(port),
        { message: "Port must be 25, 465, 587, or 2525 (common SMTP ports)" }
    ),
    isEnabled: z.boolean().default(true),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

export default function EmailSettings() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const { data: config, isLoading } = useQuery<any>({
        queryKey: ["/api/email-config"],
    });

    const form = useForm<EmailConfigForm>({
        resolver: zodResolver(emailConfigSchema),
        defaultValues: {
            smtpEmail: "",
            appPassword: "",
            smtpServer: "smtp.gmail.com",
            smtpPort: 587,
            isEnabled: true,
        },
    });

    useEffect(() => {
        if (config && Object.keys(config).length > 0) {
            form.reset({
                smtpEmail: config.smtpEmail || "",
                appPassword: config.appPassword || "",
                smtpServer: config.smtpServer || "smtp.gmail.com",
                smtpPort: config.smtpPort || 587,
                isEnabled: config.isEnabled ?? true,
            });
        }
    }, [config, form]);

    const updateConfigMutation = useMutation({
        mutationFn: async (data: EmailConfigForm) => {
            const response = await apiRequest("POST", "/api/email-config", data);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || "Failed to save email settings");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
            toast({
                title: "Success",
                description: "Email settings saved successfully! Your SMTP configuration is now active."
            });
        },
        onError: (error: any) => {
            console.error("[EmailSettings] Save error:", error);
            const errorMessage = error.message || "Failed to save email settings";
            toast({
                title: "Error Saving Settings",
                description: errorMessage,
                variant: "destructive"
            });
        },
    });

    const onSubmit = (data: EmailConfigForm) => {
        updateConfigMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <>
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </main>
            </>
        );
    }

    const isReady = config?.smtpEmail && config?.appPassword && config?.smtpServer;

    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-100 rounded-xl">
                                <Settings className="h-6 w-6 text-slate-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Email Configuration Status</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Check your current SMTP email settings</p>
                        <div className="mt-6 flex items-center gap-4 py-4 border-t border-slate-100">
                            <div className="flex items-center space-x-3">
                                <Switch
                                    checked={form.watch("isEnabled")}
                                    onCheckedChange={(value) => form.setValue("isEnabled", value)}
                                />
                                <Label className="text-sm font-bold text-slate-700">Enable Email Notifications</Label>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Send automatic emails to absent students</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Cards */}
                        <div className={`rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 border transition-all ${isReady ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`p-4 rounded-full ${isReady ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                <CheckCircle2 className={`h-12 w-12 ${isReady ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <div>
                                <h3 className={`text-2xl font-bold ${isReady ? 'text-emerald-900' : 'text-slate-400'}`}>{isReady ? 'Ready' : 'Not Configured'}</h3>
                                <p className={`text-sm font-medium ${isReady ? 'text-emerald-700' : 'text-slate-500'}`}>Email Configuration</p>
                            </div>
                        </div>

                        <div className="bg-sky-500 rounded-3xl p-8 text-white flex flex-col items-center justify-center text-center space-y-4 shadow-lg shadow-sky-100">
                            <div className="p-4 bg-white/20 rounded-full">
                                <Server className="h-12 w-12 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">{config?.smtpServer || 'smtp.gmail.com'}</h3>
                                <p className="text-sm font-medium text-sky-100 uppercase tracking-wider">SMTP Server</p>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Form */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="h-4 w-4 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-900">Configuration Details</h2>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="smtpEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-bold flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-slate-400" />
                                                    SMTP Email Address
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="vcodez.karthikeyan@gmail.com" className="rounded-xl border-slate-200 h-12 bg-slate-50/50" />
                                                </FormControl>
                                                <FormMessage />
                                                <p className="text-xs text-slate-400">Email address used to send notifications</p>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="appPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-bold flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                                                    App Password
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="password" placeholder="••••••••••••••••" className="rounded-xl border-slate-200 h-12 bg-slate-50/50" />
                                                </FormControl>
                                                <FormMessage />
                                                <p className="text-xs text-slate-400">Use app-specific password, not regular password</p>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpServer"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-bold flex items-center gap-2">
                                                    <Server className="h-4 w-4 text-slate-400" />
                                                    SMTP Server
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="smtp.gmail.com" className="rounded-xl border-slate-200 h-12 bg-slate-50/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpPort"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-bold flex items-center gap-2">
                                                    <Hash className="h-4 w-4 text-slate-400" />
                                                    SMTP Port
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="number" placeholder="587" className="rounded-xl border-slate-200 h-12 bg-slate-50/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <Button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-indigo-100 gap-2 font-bold"
                                        disabled={updateConfigMutation.isPending}
                                    >
                                        {updateConfigMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                        Save Settings
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent px-8 h-12 rounded-xl shadow-lg shadow-emerald-100 gap-2 font-bold"
                                        onClick={() => setLocation("/test-email")}
                                    >
                                        <Send className="h-4 w-4" />
                                        Test Email
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-slate-500 hover:text-slate-900 h-12 px-6 rounded-xl gap-2 font-medium"
                                        onClick={() => setLocation("/")}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Dashboard
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>

                    {/* Quick Config Table */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="h-4 w-4 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-900">Configured Values</h2>
                        </div>
                        <div className="border rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-slate-50/50">
                                        <td className="px-6 py-4 font-bold text-slate-700">SMTP Server</td>
                                        <td className="px-6 py-4 text-slate-600">{config?.smtpServer || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                <CheckCircle2 className="h-3 w-3" /> Configured
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-bold text-slate-700">SMTP Port</td>
                                        <td className="px-6 py-4 text-slate-600">{config?.smtpPort || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                <CheckCircle2 className="h-3 w-3" /> Configured
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        <td className="px-6 py-4 font-bold text-slate-700">Username</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {config?.smtpEmail ? `${config.smtpEmail.split('@')[0].slice(0, 8)}...@****.com` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                <CheckCircle2 className="h-3 w-3" /> Configured
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-bold text-slate-700">Password</td>
                                        <td className="px-6 py-4 text-slate-600">••••••••••••••••</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                <CheckCircle2 className="h-3 w-3" /> Configured
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <Button
                                type="button"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11 rounded-xl shadow-lg shadow-emerald-100 gap-2 font-bold"
                                onClick={() => setLocation("/test-email")}
                            >
                                <Send className="h-4 w-4" />
                                Test Email Configuration
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-slate-500 hover:text-slate-900 h-11 px-6 rounded-xl gap-2 font-medium"
                                onClick={() => setLocation("/")}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
