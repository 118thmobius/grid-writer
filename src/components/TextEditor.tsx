import React, { useState, useRef, useEffect } from 'react';
import CharacterCounter from './CharacterCounter';
import './TextEditor.css';
import { convertToFullWidth, convertToHalfWidth, processTextInput, createDownloadContent } from '../utils/textConverter';

const TextEditor: React.FC = () => {
  const [content, setContent] = useState('');
  const [gridMode, setGridMode] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [charsPerLine, setCharsPerLine] = useState(40);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const cursorPos = target.selectionStart;
    let text = processTextInput(target.value);
    
    if (gridMode && !isComposing) {
      // カーソル位置より前の文字数をカウント
      const beforeCursor = text.substring(0, cursorPos);
      const convertedBefore = convertToFullWidth(beforeCursor);
      
      // 全体を変換
      text = convertToFullWidth(text);
      
      // カーソル位置を復元
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = convertedBefore.length;
      }, 0);
    }
    setContent(text);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    let text = processTextInput(e.currentTarget.value);
    if (gridMode) {
      text = convertToFullWidth(text);
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
      }, 0);
    }
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
        style={gridMode ? { width: `calc(24px * ${charsPerLine} + 85px)` } : {}}
      >
        <textarea
          ref={textareaRef}
          className={`editor-content ${gridMode ? 'grid-mode' : ''}`}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="小論文を入力してください..."
          style={gridMode ? { 
            width: `${24 * charsPerLine + 5}px`
          } : {}}
        />
      </div>
    </div>
  );
};

export default TextEditor;
