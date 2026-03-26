import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Button } from '@/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

interface ColumnDef {
  key: string;
  label: string;
}

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  parseRow: (row: any[]) => any;
  requiredColumns: string[];
  onSave: (data: any[]) => Promise<void>;
  transformPreview?: (data: any[], headers: string[]) => any[];
  additionalFields?: React.ReactNode;
  headerRowsToSkip?: number;
  customColumns?: ColumnDef[];
  duplicateChecker?: (row: any) => boolean;
  // Customizable text props
  entityName?: string; // e.g., "salary matrix", "plantilla positions"
  confirmationTitle?: string;
  confirmationDescription?: string;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  title,
  parseRow,
  requiredColumns,
  onSave,
  transformPreview,
  additionalFields,
  headerRowsToSkip = 1,
  customColumns,
  duplicateChecker,
  entityName = 'salary matrix',
  confirmationTitle = 'Confirm Upload',
  confirmationDescription,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setRawData([]);
      setPreviewData([]);
      setHeaders([]);
      setErrors([]);
      setDuplicateCount(0);
      setConfirmOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const headerRow = json[0] as string[];
        setHeaders(headerRow);

        if (!customColumns && headerRowsToSkip === 1) {
          const missing = requiredColumns.filter(col => !headerRow.includes(col));
          if (missing.length > 0) {
            setErrors([`Missing required columns: ${missing.join(', ')}`]);
            return;
          }
        }

        const rows = json.slice(headerRowsToSkip) as any[][];
        const parsed = rows
          .filter(row => row.some(cell => cell !== ''))
          .map(row => parseRow(row));

        const valid = parsed.every(item => item !== null);
        if (!valid) {
          setErrors(['Some rows are malformed. Check the format.']);
          return;
        }

        let filteredParsed = parsed;
        let dupCount = 0;
        if (duplicateChecker) {
          filteredParsed = parsed.filter(row => {
            const isDup = duplicateChecker(row);
            if (isDup) dupCount++;
            return !isDup;
          });
        }
        setDuplicateCount(dupCount);
        setRawData(filteredParsed);

        const preview = transformPreview
          ? transformPreview(filteredParsed, headerRow)
          : filteredParsed;
        setPreviewData(preview);
      } catch (err) {
        setErrors(['Failed to parse Excel file.']);
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleConfirmSave = async () => {
    if (rawData.length === 0) return;
    setSaving(true);
    try {
      await toast.promise(
        onSave(rawData),
        {
          loading: `Uploading ${entityName}...`,
          success: `${entityName} uploaded successfully.`,
          error: (err) => err.message || `Upload failed.`,
        }
      );
      onClose();
    } catch (error) {
      // Error already shown by toast.promise
      console.error(error);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setRawData([]);
    setPreviewData([]);
    setHeaders([]);
    setErrors([]);
    setDuplicateCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Default description if not provided
  const defaultDescription = `Are you sure you want to upload this ${entityName}? ${
    entityName === 'salary matrix'
      ? 'A new version will be created with the details provided.'
      : ''
  }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-auto">
          {!file ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click to select an Excel file, or drag and drop</p>
              <p className="text-sm text-gray-400 mt-2">.xlsx, .xls</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-sm font-medium">File: {file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  {rawData.length} records to upload
                  {duplicateCount > 0 && (
                    <span className="ml-2 text-amber-600">({duplicateCount} duplicates skipped)</span>
                  )}
                </div>
              </div>

              {additionalFields && (
                <div className="mb-4 p-4 bg-gray-50 rounded border">
                  {additionalFields}
                </div>
              )}

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">{err}</p>
                  ))}
                </div>
              )}

              {previewData.length > 0 && (
                <div className="overflow-auto max-h-96 border rounded">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                      <TableRow>
                        {(customColumns || headers.map(h => ({ key: h, label: h }))).map((col, i) => (
                          <TableHead key={i} className="whitespace-nowrap">
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, idx) => (
                        <TableRow key={idx}>
                          {(customColumns || headers.map(h => ({ key: h, label: h }))).map((col, i) => (
                            <TableCell key={i} className="whitespace-nowrap">
                              {row[col.key] ?? '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={() => setConfirmOpen(true)}
            disabled={!rawData.length || saving}
          >
            {saving ? 'Saving...' : 'Save to Database'}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">{confirmationTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {confirmationDescription || defaultDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};