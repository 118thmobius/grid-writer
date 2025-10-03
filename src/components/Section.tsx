import { useState, useRef, useEffect, ChangeEvent, CompositionEvent } from 'react';
import CharacterCounter from './CharacterCounter';
import { convertToFullWidth, processTextInput } from '../utils/textConverter';
import './Section.css';

interface SectionProps {
  id: string;
  title: string;
  gridMode: boolean;
  charsPerLine: number;
  initialContent?: string;
  initialMaxChars?: number;
  scoring?: {
    maxPoints?: number | null;
    points?: number | null;
    comment?: string;
  };
  onDelete: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onContentChange: (id: string, content: string, maxChars: number) => void;
  canDelete?: boolean;
  isEditable?: boolean;
}

const Section = ({ 
  id, 
  title, 
  gridMode, 
  charsPerLine, 
  initialContent, 
  initialMaxChars, 
  scoring, 
  onDelete, 
  onTitleChange, 
  onContentChange, 
  canDelete = true, 
  isEditable = true 
}: SectionProps) => {
  const [content, setContent] = useState(initialContent || '');
  const [isComposing, setIsComposing] = useState(false);
  const [maxChars, setMaxChars] = useState(initialMaxChars || 400);
  
  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent);
    }
  }, [initialContent]);
  
  useEffect(() => {
    if (initialMaxChars !== undefined) {
      setMaxChars(initialMaxChars);
    }
  }, [initialMaxChars]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateCursorPosition = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const cursorPos = target.selectionStart;
    let text = processTextInput(target.value);
    
    // Check line limit
    if (gridMode) {
      const maxLines = Math.ceil(maxChars / charsPerLine);
      const lines = text.split('\n');
      if (lines.length > maxLines) {
        return; // Prevent exceeding line limit
      }
    }
    
    if (gridMode && !isComposing) {
      const originalText = text;
      text = convertToFullWidth(text);
      
      if (originalText !== text) {
        const beforeCursor = originalText.substring(0, cursorPos);
        const convertedBefore = convertToFullWidth(beforeCursor);
        
        setContent(text);
        onContentChange(id, text, maxChars);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = convertedBefore.length;
            updateCursorPosition();
          }
        }, 0);
        return;
      }
    }
    
    setContent(text);
    onContentChange(id, text, maxChars);
    updateCursorPosition();
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const target = e.currentTarget;
    const cursorPos = target.selectionStart;
    let text = processTextInput(target.value);
    
    if (gridMode) {
      const originalText = text;
      text = convertToFullWidth(text);
      
      if (originalText !== text) {
        const beforeCursor = originalText.substring(0, cursorPos);
        const convertedBefore = convertToFullWidth(beforeCursor);
        
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = convertedBefore.length;
          updateCursorPosition();
        }, 0);
      }
    }
    
    setContent(text);
    onContentChange(id, text, maxChars);
  };



  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && gridMode) {
      const maxLines = Math.ceil(maxChars / charsPerLine);
      const currentLines = content.split('\n').length;
      if (currentLines >= maxLines) {
        e.preventDefault();
        return;
      }
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = content.substring(0, start) + '　' + content.substring(end);
      setContent(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1;
        updateCursorPosition();
      }, 0);
    }
  };

  const getLineCharCounts = () => {
    if (!gridMode) return { counts: [], carryOverLines: [] };
    
    const lines = content.split('\n');
    const counts: Array<{lineIndex: number, count: number}> = [];
    const carryOverLines: Array<{lineIndex: number}> = [];
    let virtualLineIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i] || '';
      const charCount = lineText.length;
      
      if (charCount === 0) {
        virtualLineIndex++;
        continue;
      }
      
      if (charCount > charsPerLine) {
        const virtualLines = Math.ceil(charCount / charsPerLine);
        for (let k = 0; k < virtualLines - 1; k++) {
          carryOverLines.push({lineIndex: virtualLineIndex + k});
        }
        counts.push({lineIndex: virtualLineIndex + virtualLines - 1, count: charCount});
        virtualLineIndex += virtualLines;
      } else {
        counts.push({lineIndex: virtualLineIndex, count: charCount});
        virtualLineIndex++;
      }
    }
    
    return { counts, carryOverLines };
  };

  const getCursorCharCount = () => {
    if (!gridMode || !textareaRef.current) return null;
    
    const beforeCursor = content.substring(0, cursorPosition);
    const lines = beforeCursor.split('\n');
    const currentLineText = lines[lines.length - 1] || '';
    const charCount = currentLineText.length;
    
    return charCount;
  };

  const getCursorPosition = () => {
    if (!gridMode || !textareaRef.current) return null;
    
    const beforeCursor = content.substring(0, cursorPosition);
    const lines = beforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex] || '';
    const charInLine = currentLineText.length;
    
    let virtualLineIndex = 0;
    const allLines = content.split('\n');
    
    for (let i = 0; i < currentLineIndex; i++) {
      const lineText = allLines[i] || '';
      if (lineText.length > charsPerLine) {
        virtualLineIndex += Math.ceil(lineText.length / charsPerLine);
      } else {
        virtualLineIndex++;
      }
    }
    
    const currentVirtualLine = Math.floor(charInLine / charsPerLine);
    const charInVirtualLine = charInLine % charsPerLine;
    
    return {
      top: (virtualLineIndex + currentVirtualLine) * 24,
      left: charInVirtualLine * 24
    };
  };

  const calculateHeight = () => {
    if (gridMode) {
      const lines = Math.ceil(maxChars / charsPerLine);
      return lines * 24 + 4;
    } else {
      const lines = Math.ceil(maxChars / 50);
      return lines * 24 + 24;
    }
  };

  const getDisabledCells = () => {
    if (!gridMode) return [];
    
    const totalLines = Math.ceil(maxChars / charsPerLine);
    const lastLineChars = maxChars % charsPerLine;
    const disabledCells = [];
    
    if (lastLineChars > 0) {
      const lastLineIndex = totalLines - 1;
      for (let i = lastLineChars; i < charsPerLine; i++) {
        disabledCells.push({
          top: lastLineIndex * 24+1,
          left: i * 24+1,
          width: 24-3,
          height: 24-3
        });
      }
    }
    
    return disabledCells;
  };

  return (
    <div className={`section ${gridMode ? 'grid-mode' : 'normal-mode'}`}>
      <div className="section-header">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(id, e.target.value)}
          onFocus={(e) => e.target.select()}
          className="section-title"
          placeholder="セクションタイトル"
          disabled={!isEditable}
        />

        <button 
          onClick={canDelete ? () => onDelete(id) : undefined} 
          className="delete-btn"
          disabled={!canDelete}
        >
          削除
        </button>
      </div>
      
      <div className="section-toolbar">
        <div className="max-chars-control">
          <label>最大: </label>
          <select 
            value={isCustomMode ? 'custom' : maxChars} 
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setIsCustomMode(true);
              } else {
                const newMaxChars = Number(e.target.value);
                setIsCustomMode(false);
                setMaxChars(newMaxChars);
                onContentChange(id, content, newMaxChars);
              }
            }}
            className="chars-input"
            disabled={!isEditable}
          >
            {Array.from({length: 7}, (_, i) => 20 + i * 5).map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={400}>400</option>
            <option value={1000}>1000</option>
            <option value="custom">カスタム</option>
          </select>
          {isCustomMode && (
            <input 
              type="number" 
              value={maxChars} 
              onChange={(e) => {
                const newMaxChars = Math.max(1, Number(e.target.value));
                setMaxChars(newMaxChars);
                onContentChange(id, content, newMaxChars);
              }}
              className="chars-input"
              min="1"
              max="2000"
              style={{marginLeft: '5px'}}
              disabled={!isEditable}
            />
          )}
        </div>
        
        <CharacterCounter text={content} gridMode={gridMode} charsPerLine={charsPerLine} maxChars={maxChars} />
      </div>
      
      {scoring && (scoring.maxPoints !== null || scoring.points !== null || scoring.comment) && (
        <div className="section-scoring">
          {(scoring.maxPoints !== null || scoring.points !== null) && (
            <div className="score-info">
              得点: {scoring.points ?? '-'}/{scoring.maxPoints ?? '-'}
            </div>
          )}
          {scoring.comment && (
            <div className="comment-info">
              <span className="comment-label">コメント:</span>
              <pre className="comment-text" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, display: 'inline' }}>
                {scoring.comment}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div className={`section-editor ${gridMode ? 'grid-container' : ''}`}>
        <div className="editor-wrapper">
          <textarea
            ref={textareaRef}
            className={`section-content ${gridMode ? 'grid-mode' : ''}`}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onSelect={updateCursorPosition}
            onClick={updateCursorPosition}
            placeholder="内容を入力してください..."
            disabled={!isEditable}
            readOnly={!isEditable}
            style={gridMode ? { 
              width: `${24 * charsPerLine }px`,
              height: `${calculateHeight()-4}px`,
              overflow: 'hidden'
            } : { 
              height: `${calculateHeight()}px`,
              overflow: 'hidden'
            }}
          />
          {gridMode && getLineCharCounts().counts.map(({lineIndex, count}) => (
            <div 
              key={`${lineIndex}-${count}`}
              className="line-char-counter"
              style={{
                top: `${lineIndex * 24 + 8}px`
              }}
            >
              {count}
            </div>
          ))}
          {gridMode && getLineCharCounts().carryOverLines.map(({lineIndex}) => (
            <div 
              key={`carry-${lineIndex}`}
              className="carry-over-indicator"
              style={{
                top: `${lineIndex * 24 + 8}px`,
                left: `${24 * charsPerLine + 43}px`
              }}
            >
              ↓
            </div>
          ))}
          {gridMode && getCursorCharCount() !== null && getCursorCharCount()! % charsPerLine !== 0 && getCursorPosition() && (
            <div
              className="cursor-char-counter"
              style={{
                top: `${getCursorPosition()!.top + 8}px`,
                left: `${getCursorPosition()!.left + 5}px`
              }}
            >
              {getCursorCharCount()}
            </div>
          )}
          {gridMode && getDisabledCells().map((cell, index) => (
            <div 
              key={`disabled-${index}`}
              className="disabled-cell"
              style={{
                top: `${cell.top}px`,
                left: `${cell.left}px`,
                width: `${cell.width}px`,
                height: `${cell.height}px`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Section;