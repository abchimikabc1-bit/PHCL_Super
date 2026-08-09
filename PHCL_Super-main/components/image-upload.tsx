'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  uploadedAt: Date;
}

interface ImageUploadProps {
  onUpload?: (images: UploadedImage[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  multiple?: boolean;
}

export function ImageUpload({
  onUpload,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  multiple = true,
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `Invalid file format. Accepted: ${acceptedFormats.join(', ')}`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    const newImages: UploadedImage[] = [];

    const filesToProcess = Array.from(files);
    if (!multiple && filesToProcess.length > 0) {
      filesToProcess.length = 1;
    }

    if (images.length + filesToProcess.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);

    for (const file of filesToProcess) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      try {
        const preview = URL.createObjectURL(file);
        const uploadedImage: UploadedImage = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
        };
        newImages.push(uploadedImage);
      } catch (err) {
        console.log('[v0] Image processing error:', err);
        setError('Failed to process image');
      }
    }

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onUpload?.(updatedImages);
    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    const updated = images.filter(img => img.id !== id);
    setImages(updated);
    onUpload?.(updated);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-6">
      {/* Upload Area */}
      <Card
        className={`premium-card cursor-pointer transition-all ${
          isDragging ? 'ring-2 ring-amber-500 scale-105' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent
          className="p-12 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Icon */}
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full">
              <Upload size={32} />
            </div>

            {/* Text */}
            <div>
              <p className="text-xl font-bold text-gray-900 mb-1">
                {isDragging ? 'Drop images here' : 'Upload Product Images'}
              </p>
              <p className="text-gray-600">
                Drag and drop or click to select {multiple ? 'up to ' + maxFiles + ' images' : 'an image'}
              </p>
            </div>

            {/* Format info */}
            <div className="flex gap-2 flex-wrap justify-center">
              {acceptedFormats.map(format => (
                <Badge key={format} variant="outline" className="text-xs">
                  {format.split('/')[1].toUpperCase()}
                </Badge>
              ))}
            </div>

            {/* Size limit */}
            <p className="text-sm text-gray-500">Maximum file size: {maxSizeMB}MB</p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptedFormats.join(',')}
              onChange={e => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Uploaded images grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {images.length} Image{images.length !== 1 ? 's' : ''} Uploaded
            </h3>
            <Badge variant="outline" className="bg-green-50">
              <CheckCircle size={14} className="mr-1 text-green-600" />
              Ready to upload
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
              <div
                key={image.id}
                className="group relative rounded-lg overflow-hidden bg-gray-100 aspect-square"
                style={{ position: 'relative' }}
              >
                {/* Image preview */}
                <Image
                  src={image.preview}
                  alt={image.name}
                  fill
                  className="object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                  {/* Remove button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Image info tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-xs font-semibold truncate">{image.name}</p>
                  <p className="text-xs text-gray-300">{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <Button
            disabled={isUploading}
            className="mt-6 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-6"
          >
            {isUploading ? 'Processing images...' : 'Confirm & Upload Images'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
