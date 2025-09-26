import React, { useEffect, useRef, useCallback } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

interface MilkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export const MilkdownEditor: React.FC<MilkdownEditorProps> = ({
  value,
  onChange,
  placeholder
}) => {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstance = useRef<Vditor | null>(null);
  const isInitialized = useRef<boolean>(false);
  const currentValue = useRef<string>(value);

  // Stable onChange callback to prevent unnecessary re-renders
  const handleChange = useCallback((inputValue: string) => {
    console.log('MilkdownEditor: handleChange called', { inputValue });
    currentValue.current = inputValue;
    onChange?.(inputValue);
  }, [onChange]);

  useEffect(() => {
    if (vditorRef.current && !vditorInstance.current) {
      vditorInstance.current = new Vditor(vditorRef.current, {
        height: 750,
        mode: 'wysiwyg',
        placeholder: placeholder || '在此记录会议笔记...',
        theme: 'classic',
        value: value || '',
        input: handleChange,
        toolbar: [
          'emoji',
          'headings',
          'bold',
          'italic',
          'strike',
          'link',
          '|',
          'list',
          'ordered-list',
          'check',
          'outdent',
          'indent',
          '|',
          'quote',
          'line',
          'code',
          'inline-code',
          '|',
          'undo',
          'redo'
        ],
        cache: {
          enable: false
        },
        customWysiwygToolbar: undefined,
        after: () => {
          isInitialized.current = true;
          // Set initial value after initialization is complete
          if (vditorInstance.current && value) {
            vditorInstance.current.setValue(value);
            currentValue.current = value;
          }
        }
      });
    }

    return () => {
      if (vditorInstance.current) {
        try {
          // Safely destroy Vditor instance
          if (typeof vditorInstance.current.destroy === 'function') {
            // Attempt to remove event listeners and clear references
            vditorInstance.current.destroy();
          }
        } catch (error) {
          console.error('Error destroying Vditor instance:', error);
        } finally {
          vditorInstance.current = null;
          isInitialized.current = false;
        }
      }
    };
  }, [handleChange, placeholder]);

  useEffect(() => {
    // Only update if Vditor is initialized and the value is different
    if (
      isInitialized.current && 
      vditorInstance.current && 
      currentValue.current !== value
    ) {
      try {
        // Use a timeout to ensure this runs after React's render cycle
        const timeoutId = setTimeout(() => {
          if (vditorInstance.current && isInitialized.current) {
            vditorInstance.current.setValue(value || '');
            currentValue.current = value;
          }
        }, 0);

        return () => clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Error setting Vditor value:', error);
      }
    }
  }, [value]);

  return (
    <div style={{ minHeight: '400px', width: '100%' }}>
      <div ref={vditorRef} style={{ backgroundColor: '#fff' }} />
    </div>
  );
};
