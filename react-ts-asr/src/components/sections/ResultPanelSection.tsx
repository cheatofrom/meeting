import React from 'react';
import { Input, Typography } from 'antd';

const { Title } = Typography;
const { TextArea } = Input;

interface ResultPanelSectionProps {
  recognitionText: string;
}

export const ResultPanelSection: React.FC<ResultPanelSectionProps> = ({
  recognitionText
}) => {
  return (
    <div className="result-panel">
      <Title level={4}>识别结果</Title>
      <TextArea
        value={recognitionText}
        autoSize={{ minRows: 4, maxRows: 10 }}
        readOnly
      />
    </div>
  );
};