import { CircleUserRoundIcon, XIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import { useFileUpload } from "~/hooks/use-file-upload";
import { useImageUploadHandler } from "~/hooks/use-image-upload-handler";

interface AvatarUploadProps {
  initialUrl?: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}

export default function AvatarUpload({
  initialUrl,
  onUploadSuccess,
  onUploadError,
  disabled = false,
}: AvatarUploadProps) {
  const [
    { files, isDragging },
    {
      removeFile,
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
  ] = useFileUpload({
    accept: "image/*",
    onFilesAdded: (addedFiles) => {
      // Upload files to server when they're added
      addedFiles.forEach((fileWithPreview) => {
        if (fileWithPreview.file instanceof File) {
          uploadFile(fileWithPreview.file);
        }
      });
    },
  });

  const { uploadFile, uploading, uploadProgress } = useImageUploadHandler({
    onSuccess: (uploadedFile) => {
      onUploadSuccess?.(uploadedFile.url);
    },
    onError: (fileName, error) => {
      onUploadError?.(error.message);
      // Remove the file from the client state if upload fails
      if (files[0]?.file instanceof File && files[0].file.name === fileName) {
        removeFile(files[0].id);
      }
    },
  });

  // Use initial URL if no file is selected
  const previewUrl = files[0]?.preview || initialUrl || null;

  // Clear initial URL when a new file is selected
  useEffect(() => {
    if (files.length > 0 && initialUrl) {
      // The initial URL is no longer needed since we have a new file
    }
  }, [files.length, initialUrl]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex">
        {/* Drop area */}
        <button
          className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 relative flex size-16 items-center justify-center overflow-hidden rounded-full border border-dashed transition-colors outline-none focus-visible:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none"
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          aria-label={previewUrl ? "Change image" : "Upload image"}
          disabled={uploading || disabled}
          type="button"
        >
          {previewUrl ? (
            <img
              className="size-full object-cover"
              src={previewUrl}
              alt={files[0]?.file?.name || "Avatar"}
              width={64}
              height={64}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div aria-hidden="true">
              <CircleUserRoundIcon className="size-4 opacity-60" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="text-xs font-medium text-white">
                {Math.round(uploadProgress)}%
              </div>
            </div>
          )}
        </button>
        {previewUrl && !uploading && !disabled && (
          <Button
            onClick={() => {
              removeFile(files[0]?.id);
              // If we had an initial URL, we need to clear it
              if (initialUrl && !files[0]?.preview) {
                onUploadSuccess?.("");
              }
            }}
            size="icon"
            className="border-background focus-visible:border-background absolute -top-1 -right-1 size-6 rounded-full border-2 shadow-none"
            aria-label="Remove image"
            type="button"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload image file"
          tabIndex={-1}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
