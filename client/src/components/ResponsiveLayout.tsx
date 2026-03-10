import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";

interface ResponsiveLayoutProps {
    children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar when navigating (optional, but good for UX)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [window.location.pathname]);

    return (
        <div className="landing-background min-h-screen flex relative bg-gradient-to-br from-[#11754c]/8 via-[#F9F9F9] to-[#04e284]/5 dark:from-[#11754c]/10 dark:via-[#0a0a0a] dark:to-[#04e284]/8">
            {/* Decorative shapes */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#11754c]/60 to-transparent rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-[#04e284]/50 to-transparent rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-40 bg-gradient-to-t from-[#11754c]/50 to-transparent skew-y-3 pointer-events-none"></div>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/20 backdrop-blur-md bg-white/50 dark:bg-black/50 flex items-center justify-between px-4 z-50">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">V</span>
                    </div>
                    <span className="font-bold text-lg">HRM Portal</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label="Toggle Menu"
                >
                    {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Sidebar - Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Responsive constraints */}
            <div
                className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out z-40 w-64 flex-shrink-0`}
            >
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 pt-16 lg:pt-0">
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
