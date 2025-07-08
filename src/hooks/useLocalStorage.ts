import { useState, useEffect } from 'react';

// 로컬 스토리지 훅
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // 초기값 설정
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`로컬 스토리지 읽기 오류 (${key}):`, error);
      return initialValue;
    }
  });

  // 값 설정 함수
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`로컬 스토리지 저장 오류 (${key}):`, error);
    }
  };

  // 값 삭제 함수
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`로컬 스토리지 삭제 오류 (${key}):`, error);
    }
  };

  return [storedValue, setValue, removeValue];
}

// 여러 키를 한번에 관리하는 훅
export function useMultipleLocalStorage<T extends Record<string, any>>(
  keys: { [K in keyof T]: string },
  initialValues: T
): [T, (key: keyof T, value: T[keyof T]) => void, (key: keyof T) => void] {
  const [values, setValues] = useState<T>(() => {
    const stored = {} as T;
    Object.entries(keys).forEach(([stateKey, storageKey]) => {
      try {
        const item = window.localStorage.getItem(storageKey as string);
        stored[stateKey as keyof T] = item ? JSON.parse(item) : initialValues[stateKey as keyof T];
      } catch (error) {
        console.error(`로컬 스토리지 읽기 오류 (${storageKey}):`, error);
        stored[stateKey as keyof T] = initialValues[stateKey as keyof T];
      }
    });
    return stored;
  });

  const setValue = (key: keyof T, value: T[keyof T]) => {
    try {
      const storageKey = keys[key];
      setValues(prev => ({ ...prev, [key]: value }));
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.error(`로컬 스토리지 저장 오류 (${keys[key]}):`, error);
    }
  };

  const removeValue = (key: keyof T) => {
    try {
      const storageKey = keys[key];
      window.localStorage.removeItem(storageKey);
      setValues(prev => ({ ...prev, [key]: initialValues[key] }));
    } catch (error) {
      console.error(`로컬 스토리지 삭제 오류 (${keys[key]}):`, error);
    }
  };

  return [values, setValue, removeValue];
}

// 로컬 스토리지 상태를 감지하는 훅
export function useLocalStorageListener(key: string) {
  const [value, setValue] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setValue(e.newValue);
      }
    };

    // 다른 탭에서의 변경 감지
    window.addEventListener('storage', handleStorageChange);

    // 같은 탭에서의 변경 감지를 위한 커스텀 이벤트
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setValue(e.detail.newValue);
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [key]);

  return value;
}

// 로컬 스토리지 용량 관리 훅
export function useLocalStorageSize() {
  const [size, setSize] = useState<number>(0);
  const [quota, setQuota] = useState<number>(0);

  const calculateSize = () => {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      setSize(totalSize);
    } catch (error) {
      console.error('로컬 스토리지 크기 계산 오류:', error);
    }
  };

  const getQuota = async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setQuota(estimate.quota || 0);
      }
    } catch (error) {
      console.error('스토리지 할당량 조회 오류:', error);
    }
  };

  useEffect(() => {
    calculateSize();
    getQuota();
  }, []);

  return {
    size,
    quota,
    usagePercentage: quota > 0 ? (size / quota) * 100 : 0,
    refresh: calculateSize
  };
}

// 로컬 스토리지 백업/복원 훅
export function useLocalStorageBackup() {
  const backup = (keys?: string[]) => {
    try {
      const backupData: { [key: string]: string } = {};
      const keysToBackup = keys || Object.keys(localStorage);
      
      keysToBackup.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          backupData[key] = value;
        }
      });

      return {
        timestamp: new Date().toISOString(),
        data: backupData
      };
    } catch (error) {
      console.error('로컬 스토리지 백업 오류:', error);
      return null;
    }
  };

  const restore = (backupData: { timestamp: string; data: { [key: string]: string } }) => {
    try {
      Object.entries(backupData.data).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      return true;
    } catch (error) {
      console.error('로컬 스토리지 복원 오류:', error);
      return false;
    }
  };

  const clear = (keys?: string[]) => {
    try {
      if (keys) {
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        localStorage.clear();
      }
      return true;
    } catch (error) {
      console.error('로컬 스토리지 정리 오류:', error);
      return false;
    }
  };

  const exportBackup = (keys?: string[]) => {
    const backupData = backup(keys);
    if (backupData) {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const importBackup = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backupData = JSON.parse(e.target?.result as string);
          const success = restore(backupData);
          resolve(success);
        } catch (error) {
          console.error('백업 파일 가져오기 오류:', error);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  };

  return {
    backup,
    restore,
    clear,
    exportBackup,
    importBackup
  };
}