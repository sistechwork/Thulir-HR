import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Mail,
    Send,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Info
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function TestEmail() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [testEmail, setTestEmail] = useState("");

    const { data: config } = useQuery<any>({
        queryKey: ["/api/email-config"],
    });

    const testEmailMutation = useMutation({
        mutationFn: async (email: string) => {
            const response = await apiRequest("POST", "/api/email-config/test", { testEmail: email });
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: "✓ Success",
                description: "Test email sent successfully! Please check your inbox."
            });
        },
        onError: (error: any) => {
            const errorMsg = error.message || "Failed to send test email";
            const errorLines = errorMsg.split('\n');

            toast({
                title: "✗ Error",
                description: (
                    <div className="space-y-1">
                        {errorLines.map((line: string, i: number) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                ),
                variant: "destructive",
                duration: 10000 // Show for 10 seconds for detailed errors
            });
        },
    });

    const handleSendTest = () => {
        if (!testEmail) {
            toast({ title: "Error", description: "Please enter a recipient email address", variant: "destructive" });
            return;
        }
        testEmailMutation.mutate(testEmail);
    };

    const isConfigured = config?.smtpEmail && config?.appPassword;

    return (
        <>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                                <Send className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Test Your Configuration</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Verify that your SMTP settings are working correctly</p>
                    </div>

                    {/* Status Alert */}
                    {!isConfigured && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4 items-start">
                            <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-amber-900 font-bold">Incomplete Configuration</h4>
                                <p className="text-amber-700 text-sm mt-1">
                                    You haven't fully configured your SMTP settings yet. Please save your configuration before sending a test email.
                                </p>
                                <Button
                                    variant="link"
                                    className="p-0 h-auto text-amber-900 font-bold mt-2 hover:no-underline"
                                    onClick={() => setLocation("/email-settings")}
                                >
                                    Go to Settings &rarr;
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Test Form */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    Recipient Email Address
                                </Label>
                                <Input
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="your-email@example.com"
                                    className="rounded-xl border-slate-200 h-12 bg-slate-50/50"
                                    type="email"
                                />
                                <p className="text-xs text-slate-400">We'll send a test message to this address to verify your settings.</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <Button
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-xl shadow-lg shadow-emerald-100 gap-2 font-bold w-full"
                                    onClick={handleSendTest}
                                    disabled={testEmailMutation.isPending || !isConfigured}
                                >
                                    {testEmailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Send Test Email
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="text-slate-500 hover:text-slate-900 h-12 px-6 rounded-xl gap-2 font-medium w-full"
                                    onClick={() => setLocation("/email-settings")}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Configuration
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-sky-50 rounded-2xl p-6 flex gap-4 items-start">
                        <Info className="h-6 w-6 text-sky-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-sky-800 space-y-2">
                            <p className="font-bold">What to expect:</p>
                            <ul className="list-disc list-inside space-y-1 text-sky-700/80">
                                <li>The test email will be sent using your configured SMTP account.</li>
                                <li>It should arrive within a few minutes.</li>
                                <li>Check your spam/junk folder if you don't see it.</li>
                                <li>If it fails, double-check your App Password and SMTP server details.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
