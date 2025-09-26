import React from 'react';
import { Button, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { MilkdownEditor } from '../MilkdownEditor/MilkdownEditor';

interface NotesTabProps {
  notes: string;
  setNotes: (notes: string) => void;
  onSaveNotes: () => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  setNotes,
  onSaveNotes
}) => {
  const debugSetNotes = (newNotes: string) => {
    console.log('NotesTab: setNotes called', { newNotes, currentNotes: notes });
    setNotes(newNotes);
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
      <div style={{ marginBottom: '12px' }}>
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={onSaveNotes}
            disabled={!notes.trim()}
          >
            保存笔记
          </Button>
          <Button
            size="small"
            onClick={() => setNotes('')}
            disabled={!notes.trim()}
          >
            清空
          </Button>
        </Space>
      </div>
      <div style={{ flex: 1, position: 'relative', marginBottom: '40px' }}>
        <div style={{
          height: '800px',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          background: '#fff',
          overflow: 'auto'
        }}>
          <MilkdownEditor
            value={notes}
            onChange={debugSetNotes}
            placeholder="在此记录会议笔记..."
          />
        </div>
      </div>
    </div>
  );
};
