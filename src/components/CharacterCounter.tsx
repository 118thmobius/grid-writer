import React from 'react';

interface CharacterCounterProps {
  text: string;
  gridMode?: boolean;
  charsPerLine?: number;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({ text, gridMode = false, charsPerLine = 40 }) => {
  const totalChars = text.length;
  const nonSpaceChars = text.replace(/\s/g, '').length;
  const lines = text.split('\n');
  
  // 改行による行数
  const actualLineCount = lines.length;
  
  // 方眼紙における行数（文字数超過を含む）
  const gridLineCount = lines.reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);

  return (
    <div className="character-counter">
      <div className="counter-item">
        <span className="counter-label">総文字数:</span>
        <span className="counter-value">{totalChars}</span>
      </div>
      <div className="counter-item">
        <span className="counter-label">文字数(空白除く):</span>
        <span className="counter-value">{nonSpaceChars}</span>
      </div>
      <div className="counter-item">
        <span className="counter-label">行数:</span>
        <span className="counter-value">{actualLineCount}</span>
      </div>
      {gridMode && (
        <div className="counter-item">
          <span className="counter-label">方眼行数:</span>
          <span className="counter-value">{gridLineCount}</span>
        </div>
      )}

    </div>
  );
};

export default CharacterCounter;
