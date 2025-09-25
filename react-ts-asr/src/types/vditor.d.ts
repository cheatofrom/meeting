declare module 'vditor' {
  interface VditorOptions {
    height?: number;
    mode?: 'wysiwyg' | 'ir' | 'sv';
    placeholder?: string;
    theme?: 'classic' | 'dark';
    value?: string;
    input?: (value: string) => void;
    toolbar?: string[];
    cache?: {
      enable: boolean;
    };
    after?: () => void;
  }

  export default class Vditor {
    constructor(element: HTMLElement, options?: VditorOptions);
    getValue(): string;
    setValue(value: string): void;
    destroy(): void;
  }
}

declare module 'vditor/dist/index.css';
