import React, { useState } from 'react';
import CharacterCounter from './CharacterCounter';
import './TextEditor.css';

const TextEditor: React.FC = () => {
  const [content, setContent] = useState('');
  const [gridMode, setGridMode] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [charsPerLine, setCharsPerLine] = useState(40);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    let text = e.currentTarget.value;
    if (gridMode && !isComposing) {
      // すべての半角文字を全角に変換
      text = text.replace(/[\x20-\x7E]/g, (char) => {
        if (char === ' ') return '　';
        return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
      });
    }
    setContent(text);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    let text = e.currentTarget.value;
    if (gridMode) {
      text = text.replace(/[\x20-\x7E]/g, (char) => {
        if (char === ' ') return '　';
        return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
      });
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

  const toggleGridMode = () => {
    const newGridMode = !gridMode;
    setGridMode(newGridMode);
    
    if (newGridMode) {
      // 方眼紙ON: 半角を全角に変換
      const convertedText = content.replace(/[\x20-\x7E]/g, (char) => {
        if (char === ' ') return '　';
        return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
      });
      setContent(convertedText);
    } else {
      // 方眼紙OFF: 全角を半角に変換
      const convertedText = content.replace(/[！-～　]/g, (char) => {
        if (char === '　') return ' ';
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
      });
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
        {gridMode && (
          <div className="chars-per-line-control">
            <label>1行文字数: </label>
            <input 
              type="number" 
              min="10" 
              max="40" 
              value={charsPerLine} 
              onChange={(e) => setCharsPerLine(Number(e.target.value))}
              className="chars-input"
            />
          </div>
        )}
        <CharacterCounter text={content} gridMode={gridMode} charsPerLine={charsPerLine} />
      </div>
      
      <textarea
        className={`editor-content ${gridMode ? 'grid-mode' : ''}`}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="小論文を入力してください..."
        style={gridMode ? { width: `calc(24px * ${charsPerLine})` } : {}}
      />
      
      <div className="editor-status">
        <span>文字数: {content.length}</span>
      </div>
    </div>
  );
};

export default TextEditor;
