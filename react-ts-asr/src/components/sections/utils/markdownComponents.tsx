import { useMemo } from 'react';

export const useMarkdownComponents = () => {
  return useMemo(() => ({
    table: ({ children }: any) => (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        {children}
      </table>
    ),
    thead: ({ children }: any) => (
      <thead style={{ backgroundColor: '#f0f2f5' }}>
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th style={{
        padding: '8px 12px',
        border: '1px solid #d9d9d9',
        textAlign: 'left',
        fontWeight: '600'
      }}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td style={{
        padding: '8px 12px',
        border: '1px solid #d9d9d9'
      }}>
        {children}
      </td>
    ),
    h1: ({ children }: any) => (
      <h1 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginTop: '24px',
        marginBottom: '12px',
        color: '#262626'
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 style={{
        fontSize: '18px',
        fontWeight: '600',
        marginTop: '20px',
        marginBottom: '10px',
        color: '#262626'
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        marginTop: '16px',
        marginBottom: '8px',
        color: '#262626'
      }}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p style={{
        marginBottom: '12px',
        lineHeight: '1.6',
        fontSize: '14px',
        color: '#262626'
      }}>
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul style={{
        marginBottom: '12px',
        paddingLeft: '20px'
      }}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol style={{
        marginBottom: '12px',
        paddingLeft: '20px'
      }}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li style={{
        marginBottom: '4px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#262626'
      }}>
        {children}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong style={{ fontWeight: '600', color: '#262626' }}>
        {children}
      </strong>
    ),
    code: ({ children, className }: any) => {
      const isInline = !className;
      return isInline ? (
        <code style={{
          backgroundColor: '#f6f8fa',
          padding: '2px 4px',
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: 'monospace'
        }}>
          {children}
        </code>
      ) : (
        <code style={{
          display: 'block',
          backgroundColor: '#f6f8fa',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '13px',
          fontFamily: 'monospace',
          overflow: 'auto',
          marginBottom: '12px'
        }}>
          {children}
        </code>
      );
    },
    blockquote: ({ children, ...props }: any) => (
      <blockquote {...props} style={{
        borderLeft: '4px solid #1890ff',
        paddingLeft: '16px',
        marginLeft: '0',
        marginBottom: '12px',
        color: '#595959',
        fontStyle: 'italic'
      }}>
        {children}
      </blockquote>
    )
  }), []);
};