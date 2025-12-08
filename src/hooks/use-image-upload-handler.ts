import { useState } from "react";
import { toast } from "sonner";
import { formatBytes } from "./use-file-upload";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

interface UseImageUploadHandlerOptions {
  onSuccess?: (file: UploadedFile) => void;
  onError?: (fileName: string, error: Error) => void;
  maxFileSize?: number; // in bytes
}

export function useImageUploadHandler(options: UseImageUploadHandlerOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    onSuccess,
    onError,
    maxFileSize = 5 * 1024 * 1024, // 5MB default
  } = options;

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!file.type.startsWith("image/")) {
      const error = new Error(`${file.name} is not an image file`);
      toast.error(error.message);
      onError?.(file.name, error);
      return null;
    }

    if (file.size > maxFileSize) {
      const error = new Error(`${file.name} is too large (max ${formatBytes(maxFileSize)})`);
      toast.error(error.message);
      onError?.(file.name, error);
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        url,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      };

      toast.success(`${file.name} uploaded successfully`);
      onSuccess?.(uploadedFile);
      return uploadedFile;
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      toast.error(`Failed to upload ${file.name}`);
      onError?.(file.name, new Error(errorMessage));
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadFiles = async (files: FileList | File[]): Promise<UploadedFile[]> => {
    const fileArray = Array.from(files);
    const uploadedFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const result = await uploadFile(file);
      if (result) {
        uploadedFiles.push(result);
      }
    }

    return uploadedFiles;
  };

  return {
    uploadFile,
    uploadFiles,
    uploading,
    uploadProgress,
  };
}
