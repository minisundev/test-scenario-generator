import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import { validateFile, formatFileSize, getFileTypeIcon, createDragDropHandlers } from '../../utils/fileUtils.ts';

interface FileUploaderProps {
  acceptedExtensions: string[];
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
}

interface FileWithId extends File {
  id: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  acceptedExtensions,
  maxFiles = 10,
  onFilesChange,
  title = "파일을 드래그 앤 드롭하거나 클릭하여 업로드",
  description = "지원되는 파일 형식을 확인하세요",
  className = "",
  disabled = false,
  showPreview = true
}) => {
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: File[]) => {
    const validFiles: FileWithId[] = [];
    const newErrors: string[] = [];

    newFiles.forEach(file => {
      const validation = validateFile(file, acceptedExtensions);
      if (validation.isValid) {
        const fileWithId: FileWithId = Object.assign(file, {
          id: `${file.name}-${Date.now()}-${Math.random()}`
        });
        validFiles.push(fileWithId);
      } else {
        newErrors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (files.length + validFiles.length > maxFiles) {
      newErrors.push(`최대 ${maxFiles}개 파일까지만 업로드할 수 있습니다.`);
      return;
    }

    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    setErrors(newErrors);
    onFilesChange(updatedFiles);
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    // 파일을 제거했으므로 관련 에러도 정리
    setErrors([]);
  };

  const clearAllFiles = () => {
    setFiles([]);
    setErrors([]);
    onFilesChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const dragDropHandlers = createDragDropHandlers(addFiles, acceptedExtensions);

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 업로드 영역 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50 cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedExtensions.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            dragOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Upload className={`w-8 h-8 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {description}
            </p>
            
            <div className="text-xs text-gray-400 space-y-1">
              <p>지원 형식: {acceptedExtensions.join(', ')}</p>
              <p>최대 파일 수: {maxFiles}개</p>
              <p>파일당 최대 크기: 10MB</p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              파일 선택
            </button>
          )}
        </div>

        {dragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 font-medium">파일을 여기에 놓으세요</div>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-red-800">업로드 오류</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 파일 목록 */}
      {showPreview && files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              업로드된 파일 ({files.length}/{maxFiles})
            </h4>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-600 hover:text-red-800"
            >
              모두 삭제
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">
                    {getFileTypeIcon(file.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-3 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                  title="파일 제거"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파일 수 제한 표시 */}
      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>총 {files.length}개 파일 업로드됨</span>
          <span>
            총 크기: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
          </span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;