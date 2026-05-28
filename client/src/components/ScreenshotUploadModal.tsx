import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, ImageIcon, X, AlertCircle, CheckCircle, Edit2 } from "lucide-react";

interface ScreenshotUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedLead {
  Name: string;
  Location: string;
  College: string;
  Degree: string;
  Phone: string;
  Email: string;
  Source: string;
  File: string;
  error?: string;
}

export default function ScreenshotUploadModal({ isOpen, onClose }: ScreenshotUploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedLead[] | null>(null);
  const [allocationStrategy, setAllocationStrategy] = useState<string>("shared-pool");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mutation to extract data from screenshots
  const extractMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/leads/extract-screenshots', {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return response.json();
    },
    onSuccess: (data: ExtractedLead[]) => {
      // Sort data: Naukri first, then Shine
      const sortedData = [...data].sort((a, b) => {
        if (a.Source.includes('Naukri') && !b.Source.includes('Naukri')) return -1;
        if (!a.Source.includes('Naukri') && b.Source.includes('Naukri')) return 1;
        return 0;
      });
      setExtractedData(sortedData);
      setUploadProgress(100);
      toast({
        title: "Extraction Complete",
        description: `Successfully processed ${data.length} screenshots`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/login";
        return;
      }
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to process screenshots",
        variant: "destructive",
      });
    },
  });

  // Mutation to push data to database
  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData) throw new Error("No data to push");
      
      const payload = {
        leads: extractedData,
        allocationStrategy,
        category: 'Client Hiring'
      };

      const response = await fetch('/api/leads/bulk-insert-json', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Save Successful",
        description: `Added ${result.processedCount} leads to the database`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save leads to database",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const validFiles: File[] = [];
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    Array.from(files).forEach(file => {
      if (validTypes.includes(file.type)) {
        if (file.size <= 10 * 1024 * 1024) { // 10MB limit
          validFiles.push(file);
        } else {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a valid image file`,
          variant: "destructive",
        });
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleExtract = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('screenshots', file);
    });

    setUploadProgress(10);
    // Fake progress interval
    const interval = setInterval(() => {
      setUploadProgress(p => p < 90 ? p + 5 : p);
    }, 500);

    try {
      await extractMutation.mutateAsync(formData);
    } finally {
      clearInterval(interval);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setExtractedData(null);
    setUploadProgress(0);
    onClose();
  };

  const updateLeadField = (index: number, field: keyof ExtractedLead, value: string) => {
    if (!extractedData) return;
    const newData = [...extractedData];
    newData[index] = { ...newData[index], [field]: value };
    setExtractedData(newData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ImageIcon className="mr-2 h-5 w-5" />
            Screenshot Lead Extraction
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload screenshots from Naukri or Shine to automatically extract candidate details
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {!extractedData && (
            <>
              {/* File Upload Area */}
              <div
                className={`upload-area ${dragOver ? 'border-primary bg-primary/5' : ''} ${selectedFiles.length > 0 ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('screenshot-input')?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '0.5rem',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  id="screenshot-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="space-y-3">
                  {selectedFiles.length > 0 ? (
                    <>
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-green-700 dark:text-green-400">
                          {selectedFiles.length} File(s) Selected
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedFiles.map(f => f.name).join(', ').substring(0, 50)}...
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">Drop screenshots here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </div>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Supported formats: .png, .jpg, .jpeg, .webp</p>
                    <p>Multiple files allowed</p>
                  </div>
                </div>
              </div>

              {extractMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Extracting Text via OCR...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button 
                  onClick={handleExtract} 
                  disabled={selectedFiles.length === 0 || extractMutation.isPending}
                >
                  {extractMutation.isPending ? "Processing..." : "Extract Data"}
                </Button>
              </div>
            </>
          )}

          {/* Extracted Data Table */}
          {extractedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Extracted Data Review</h3>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Edit2 className="h-3 w-3 mr-1" /> Edit fields before saving
                </span>
              </div>
              
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Degree</th>
                      <th className="px-4 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.map((row, idx) => (
                      <tr key={idx} className="border-b bg-card">
                        <td className="px-4 py-2">
                          <Input 
                            value={row.Name || ''} 
                            onChange={(e) => updateLeadField(idx, 'Name', e.target.value)}
                            className="h-8 w-32 md:w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input 
                            value={row.Email || ''} 
                            onChange={(e) => updateLeadField(idx, 'Email', e.target.value)}
                            className="h-8 w-32 md:w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input 
                            value={row.Phone || ''} 
                            onChange={(e) => updateLeadField(idx, 'Phone', e.target.value)}
                            className="h-8 w-32 md:w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input 
                            value={row.Location || ''} 
                            onChange={(e) => updateLeadField(idx, 'Location', e.target.value)}
                            className="h-8 w-32 md:w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input 
                            value={row.Degree || ''} 
                            onChange={(e) => updateLeadField(idx, 'Degree', e.target.value)}
                            className="h-8 w-32 md:w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {row.Source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Allocation Strategy */}
              <div className="space-y-3 pt-4 border-t border-border mt-4">
                <Label className="text-sm font-medium">Allocation Strategy</Label>
                <RadioGroup
                  value={allocationStrategy}
                  onValueChange={setAllocationStrategy}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="round-robin" id="round-robin" className="mt-1" />
                    <Label htmlFor="round-robin" className="cursor-pointer space-y-1">
                      <div className="font-medium">Round Robin</div>
                      <div className="text-sm text-muted-foreground">Distribute leads evenly among HR personnel</div>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="shared-pool" id="shared-pool" className="mt-1" />
                    <Label htmlFor="shared-pool" className="cursor-pointer space-y-1">
                      <div className="font-medium">Shared Pool</div>
                      <div className="text-sm text-muted-foreground">HR personnel pick leads from common pool</div>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="manual" id="manual" className="mt-1" />
                    <Label htmlFor="manual" className="cursor-pointer space-y-1">
                      <div className="font-medium">Manual Assignment</div>
                      <div className="text-sm text-muted-foreground">Manually assign leads after upload</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setExtractedData(null)}>Back</Button>
                <Button 
                  onClick={() => pushMutation.mutate()}
                  disabled={pushMutation.isPending}
                >
                  {pushMutation.isPending ? "Saving..." : "Push to Database"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
