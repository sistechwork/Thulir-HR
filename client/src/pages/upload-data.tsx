import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, ImageIcon, Send } from "lucide-react";
import BulkUploadModal from "@/components/BulkUploadModal";
import ScreenshotUploadModal from "@/components/ScreenshotUploadModal";
import PushDataModal from "@/components/PushDataModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function UploadData() {
  const { user } = useAuth();
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);
  const [showPushData, setShowPushData] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { toast } = useToast();

  const { data: tempLeads = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/temp-leads"],
  });

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/temp-leads/all", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete all temp leads");
      
      toast({ title: "Success", description: "All temporary leads deleted permanently" });
      setShowDeleteAllConfirm(false);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <main className="w-full">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Upload Data Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Import leads to the temporary storage and push them to the database.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="bg-white shadow-sm hover:bg-gray-50 hover:text-primary transition-all duration-200"
                onClick={() => setShowScreenshotUpload(true)}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Screenshot OCR
              </Button>
              <Button
                variant="outline"
                className="bg-white shadow-sm hover:bg-gray-50 hover:text-primary transition-all duration-200"
                onClick={() => setShowBulkUpload(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
              <Button
                className="bg-primary shadow-sm hover:bg-primary/90 transition-all duration-200"
                onClick={() => setShowPushData(true)}
                disabled={tempLeads.length === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                Push to Database
              </Button>
              {((user as any)?.role === 'manager' || (user as any)?.role === 'admin') && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteAllConfirm(true)}
                  disabled={tempLeads.length === 0}
                >
                  Delete All
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-500 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Contact Info</th>
                    <th className="px-6 py-4 font-medium">Location</th>
                    <th className="px-6 py-4 font-medium">Education</th>
                    <th className="px-6 py-4 font-medium">Source</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Loading temporary leads...</span>
                        </div>
                      </td>
                    </tr>
                  ) : tempLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No temporary leads found. Upload data to get started.
                      </td>
                    </tr>
                  ) : (
                    tempLeads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{lead.phone || '-'}</div>
                          <div className="text-gray-500 text-xs">{lead.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{lead.location || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{lead.degree || '-'}</div>
                          <div className="text-gray-500 text-xs">{lead.collegeName || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                            {lead.source?.replace('_', ' ') || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {showBulkUpload && (
        <BulkUploadModal
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
        />
      )}

      {showScreenshotUpload && (
        <ScreenshotUploadModal
          isOpen={showScreenshotUpload}
          onClose={() => setShowScreenshotUpload(false)}
        />
      )}

      {showPushData && (
        <PushDataModal
          isOpen={showPushData}
          onClose={() => setShowPushData(false)}
          maxLeads={tempLeads.length}
        />
      )}

      {showDeleteAllConfirm && (
        <Dialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Temporary Leads</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to permanently delete ALL temporary leads? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteAllConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeletingAll}>
                {isDeletingAll ? "Deleting..." : "Yes, Delete All"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
