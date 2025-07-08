import type { UploadedFile } from '../types/index.ts';

// 지원되는 파일 확장자
export const SUPPORTED_CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  '.py', '.java', '.cpp', '.c', '.cs', '.php', 
  '.go', '.rs', '.rb', '.swift', '.kt', '.scala'
];

export const SUPPORTED_DOC_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.md'
];

// 파일 크기 제한 (기본 10MB)
export const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760');

// 파일 유효성 검증
export const validateFile = (file: File, allowedExtensions: string[]): { isValid: boolean; error?: string } => {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB까지 허용됩니다.`
    };
  }

  // 파일 확장자 검증
  const fileExtension = getFileExtension(file.name);
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `지원되지 않는 파일 형식입니다. 허용된 확장자: ${allowedExtensions.join(', ')}`
    };
  }

  return { isValid: true };
};

// 파일 확장자 추출
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex).toLowerCase() : '';
};

// 파일을 텍스트로 읽기
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('파일을 텍스트로 읽을 수 없습니다.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
};

// 파일을 Base64로 읽기
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        // data:application/octet-stream;base64, 부분 제거
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      } else {
        reject(new Error('파일을 Base64로 읽을 수 없습니다.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    };
    
    reader.readAsDataURL(file);
  });
};

// 파일 배열을 Base64 배열로 변환
export const convertFilesToBase64 = async (files: File[]): Promise<Array<{ filename: string; content: string; extension: string }>> => {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFileAsText(file);
        return {
          filename: file.name,
          content: content,
          extension: getFileExtension(file.name)
        };
      } catch (error) {
        console.error(`파일 읽기 실패: ${file.name}`, error);
        throw new Error(`${file.name} 파일을 읽을 수 없습니다.`);
      }
    })
  );
  
  return results;
};

// 파일 크기를 읽기 쉬운 형태로 변환
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// 파일 타입 아이콘 반환
export const getFileTypeIcon = (filename: string): string => {
  const extension = getFileExtension(filename);
  
  const iconMap: { [key: string]: string } = {
    '.js': '🟨',
    '.jsx': '⚛️',
    '.ts': '🔷',
    '.tsx': '⚛️',
    '.vue': '💚',
    '.svelte': '🧡',
    '.py': '🐍',
    '.java': '☕',
    '.cpp': '⚙️',
    '.c': '⚙️',
    '.cs': '💙',
    '.php': '💜',
    '.go': '🐹',
    '.rs': '🦀',
    '.rb': '💎',
    '.swift': '🍎',
    '.kt': '📱',
    '.scala': '⚖️',
    '.pdf': '📄',
    '.doc': '📝',
    '.docx': '📝',
    '.txt': '📄',
    '.md': '📝'
  };
  
  return iconMap[extension] || '📄';
};

// 파일 MIME 타입 감지
export const getMimeType = (filename: string): string => {
  const extension = getFileExtension(filename);
  
  const mimeMap: { [key: string]: string } = {
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.vue': 'text/plain',
    '.svelte': 'text/plain',
    '.py': 'text/x-python',
    '.java': 'text/x-java-source',
    '.cpp': 'text/x-c++src',
    '.c': 'text/x-csrc',
    '.cs': 'text/x-csharp',
    '.php': 'text/x-php',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.rb': 'text/x-ruby',
    '.swift': 'text/x-swift',
    '.kt': 'text/x-kotlin',
    '.scala': 'text/x-scala',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
  };
  
  return mimeMap[extension] || 'text/plain';
};

// 드래그 앤 드롭 이벤트 핸들러
export const createDragDropHandlers = (
  onFiles: (files: File[]) => void,
  allowedExtensions: string[]
) => {
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer?.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = validateFile(file, allowedExtensions);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert('일부 파일을 처리할 수 없습니다:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onFiles(validFiles);
    }
  };

  return {
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop
  };
};

// 파일 다운로드 유틸리티
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 메모리 정리
  URL.revokeObjectURL(url);
};

// 파일 목록을 ZIP으로 압축 (브라우저 환경에서는 제한적)
export const createFileArchive = (files: Array<{ name: string; content: string }>): string => {
  // 간단한 텍스트 기반 아카이브 형태로 반환
  let archive = '=== 파일 아카이브 ===\n\n';
  
  files.forEach((file, index) => {
    archive += `=== 파일 ${index + 1}: ${file.name} ===\n`;
    archive += file.content;
    archive += '\n\n';
  });
  
  return archive;
};

// 코드 언어 감지
export const detectCodeLanguage = (filename: string, content?: string): string => {
  const extension = getFileExtension(filename);
  
  const languageMap: { [key: string]: string } = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala'
  };
  
  const detectedFromExtension = languageMap[extension];
  
  // 파일 내용을 기반으로 추가 감지 로직
  if (content && !detectedFromExtension) {
    if (content.includes('import React') || content.includes('useState')) {
      return 'javascript';
    }
    if (content.includes('def ') && content.includes('import ')) {
      return 'python';
    }
    if (content.includes('public class') && content.includes('static void main')) {
      return 'java';
    }
  }
  
  return detectedFromExtension || 'text';
};

// 파일 내용 미리보기 생성 (처음 몇 줄만)
export const generateFilePreview = (content: string, maxLines: number = 5): string => {
  const lines = content.split('\n');
  const preview = lines.slice(0, maxLines).join('\n');
  
  if (lines.length > maxLines) {
    return preview + `\n... (총 ${lines.length}줄 중 ${maxLines}줄 표시)`;
  }
  
  return preview;
};