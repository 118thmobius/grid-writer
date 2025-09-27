import React, { useState, useRef, useEffect } from 'react';
import CharacterCounter from './CharacterCounter';
import './TextEditor.css';
import { convertToFullWidth, convertToHalfWidth, processTextInput, createDownloadContent } from '../utils/textConverter';

const TextEditor: React.FC = () => {
  const [content, setContent] = useState('');
  const [gridMode, setGridMode] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [charsPerLine, setCharsPerLine] = useState(40);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateCursorPosition = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const cursorPos = target.selectionStart;
    let text = processTextInput(target.value);
    
    if (gridMode && !isComposing) {
      const originalText = text;
      text = convertToFullWidth(text);
      
      if (originalText !== text) {
        const beforeCursor = originalText.substring(0, cursorPos);
        const convertedBefore = convertToFullWidth(beforeCursor);
        
        setContent(text);
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
    updateCursorPosition();
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        const lastVirtualLineChars = charCount % charsPerLine || charsPerLine;
        
        if (lastVirtualLineChars === charsPerLine && i + 1 < lines.length && lines[i + 1].length > 0) {
          let totalCount = charCount;
          let j = i + 1;
          
          // Mark full lines as carry-over lines
          for (let k = 0; k < virtualLines - 1; k++) {
            carryOverLines.push({lineIndex: virtualLineIndex + k});
          }
          
          while (j < lines.length && lines[j].length > 0 && lines[j].length >= charsPerLine) {
            const currentVirtualLines = Math.ceil(lines[j].length / charsPerLine);
            for (let k = 0; k < currentVirtualLines - 1; k++) {
              carryOverLines.push({lineIndex: virtualLineIndex + Math.ceil(totalCount / charsPerLine) + k});
            }
            totalCount += lines[j].length;
            j++;
          }
          
          if (j < lines.length && lines[j].length > 0) {
            totalCount += lines[j].length;
            const totalVirtualLines = Math.ceil(totalCount / charsPerLine);
            counts.push({lineIndex: virtualLineIndex + totalVirtualLines - 1, count: totalCount});
            virtualLineIndex += totalVirtualLines;
            i = j;
          } else {
            counts.push({lineIndex: virtualLineIndex + virtualLines - 1, count: totalCount});
            virtualLineIndex += virtualLines;
            i = j - 1;
          }
        } else {
          // Mark full lines as carry-over lines
          for (let k = 0; k < virtualLines - 1; k++) {
            carryOverLines.push({lineIndex: virtualLineIndex + k});
          }
          counts.push({lineIndex: virtualLineIndex + virtualLines - 1, count: charCount});
          virtualLineIndex += virtualLines;
        }
      } else if (charCount >= charsPerLine && i + 1 < lines.length && lines[i + 1].length > 0) {
        let totalCount = charCount;
        let j = i + 1;
        
        // Mark this line as carry-over
        carryOverLines.push({lineIndex: virtualLineIndex});
        
        while (j < lines.length && lines[j].length > 0 && lines[j].length >= charsPerLine) {
          const currentVirtualLines = Math.ceil(lines[j].length / charsPerLine);
          for (let k = 0; k < currentVirtualLines - 1; k++) {
            carryOverLines.push({lineIndex: virtualLineIndex + Math.ceil(totalCount / charsPerLine) + k});
          }
          totalCount += lines[j].length;
          j++;
        }
        
        if (j < lines.length && lines[j].length > 0) {
          totalCount += lines[j].length;
          const totalVirtualLines = Math.ceil(totalCount / charsPerLine);
          counts.push({lineIndex: virtualLineIndex + totalVirtualLines - 1, count: totalCount});
          virtualLineIndex += totalVirtualLines;
          i = j;
        } else {
          const totalVirtualLines = Math.ceil(totalCount / charsPerLine);
          counts.push({lineIndex: virtualLineIndex + totalVirtualLines - 1, count: totalCount});
          virtualLineIndex += totalVirtualLines;
          i = j - 1;
        }
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

  const handleDownload = () => {
    const downloadText = createDownloadContent(content);
    const blob = new Blob([downloadText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '小論文.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncBackgroundPosition = () => {
    if (textareaRef.current && gridMode) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      textareaRef.current.style.backgroundPosition = `${-scrollLeft}px ${-scrollTop}px`;
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleScroll = () => syncBackgroundPosition();
    const handleInput = () => {
      setTimeout(syncBackgroundPosition, 0);
    };

    textarea.addEventListener('scroll', handleScroll);
    textarea.addEventListener('input', handleInput);

    return () => {
      textarea.removeEventListener('scroll', handleScroll);
      textarea.removeEventListener('input', handleInput);
    };
  }, [gridMode]);



  const toggleGridMode = () => {
    const newGridMode = !gridMode;
    setGridMode(newGridMode);
    
    if (newGridMode) {
      // 方眼紙ON: 半角を全角に変換
      const convertedText = convertToFullWidth(content);
      setContent(convertedText);
    } else {
      // 方眼紙OFF: 全角を半角に変換
      const convertedText = convertToHalfWidth(content);
      setContent(convertedText);
    }
  };

  return (
    <div className="text-editor">
      <div className="editor-toolbar">
        <button 
          onClick={toggleGridMode} 
          className={`grid-btn ${gridMode ? 'active' : ''}`}
        >
          {gridMode ? '方眼紙OFF' : '方眼紙ON'}
        </button>

        <button onClick={handleDownload} className="download-btn">
            ダウンロード
        </button>
        {gridMode && (
          <div className="chars-per-line-control">
            <label>1行文字数: </label>
            <select 
              value={charsPerLine} 
              onChange={(e) => setCharsPerLine(Number(e.target.value))}
              className="chars-input"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={40}>40</option>
            </select>
          </div>
        )}
        <CharacterCounter text={content} gridMode={gridMode} charsPerLine={charsPerLine} />
      </div>
      
      <div 
        className={`editor-container ${gridMode ? 'grid-container' : ''}`}
        style={gridMode ? { width: `calc(24px * ${charsPerLine} + 120px)` } : {}}
      >
        <div className="editor-wrapper">
          <textarea
            ref={textareaRef}
            className={`editor-content ${gridMode ? 'grid-mode' : ''}`}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onSelect={updateCursorPosition}
            onClick={updateCursorPosition}
            placeholder="小論文を入力してください..."
            style={gridMode ? { 
              width: `${24 * charsPerLine + 2}px`
            } : {}}
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
                left: `${24 * charsPerLine + 35}px`
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
                left: `${getCursorPosition()!.left + 2}px`
              }}
            >
              {getCursorCharCount()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
