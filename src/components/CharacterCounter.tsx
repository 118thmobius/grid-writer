import React from 'react';

interface CharacterCounterProps {
  text: string;
  gridMode?: boolean;
  charsPerLine?: number;
}

const calculateStats = (inputText: string, charsPerLine: number) => {
  const totalChars = inputText.replace(/\n/g, '').length;
  const nonSpaceChars = inputText.replace(/\s/g, '').length;
  const lines = inputText.split('\n');
  const actualLineCount = lines.length;
  const gridLineCount = lines.reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);
  
  return { totalChars, nonSpaceChars, actualLineCount, gridLineCount };
};

const CharacterCounter: React.FC<CharacterCounterProps> = ({ text, gridMode = false, charsPerLine = 40 }) => {
  const stats = calculateStats(text, charsPerLine);

  return (
    <div className="character-counter">
      <div className="counter-item">
        <span className="counter-label">総文字数:</span>
        <span className="counter-value">{stats.totalChars}</span>
      </div>
      <div className="counter-item">
        <span className="counter-label">文字数(空白除く):</span>
        <span className="counter-value">{stats.nonSpaceChars}</span>
      </div>
      <div className="counter-item">
        <span className="counter-label">行数:</span>
        <span className="counter-value">{stats.actualLineCount}</span>
      </div>
      {gridMode && (
        <div className="counter-item">
          <span className="counter-label">方眼行数:</span>
          <span className="counter-value">{stats.gridLineCount}</span>
        </div>
      )}

    </div>
  );
};

export default CharacterCounter;
