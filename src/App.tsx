import { useState } from 'react';
import Section from './components/Section';
import { convertToFullWidth } from './utils/textConverter';
import './App.css';

interface SectionData {
  id: string;
  title: string;
  content?: string;
  maxChars?: number;
}

interface ImportedSection {
  id?: string;
  title?: string;
  content?: string;
  metadata?: {
    maxCharacters?: number;
  };
  scoring?: {
    maxPoints?: number | null;
    points?: number | null;
    comment?: string;
  };
}

interface ImportedEssay {
  essay?: {
    title?: string;
    globalSettings?: {
      gridMode?: boolean;
      charsPerLine?: number;
    };
    sections?: ImportedSection[];
    totalScoring?: {
      maxPoints?: number | null;
      points?: number | null;
      overallComment?: string;
    };
  };
}

function App() {
  const [sections, setSections] = useState<SectionData[]>([
    { id: '1', title: 'セクション1' }
  ]);
  const [globalGridMode, setGlobalGridMode] = useState(true);
  const [globalCharsPerLine, setGlobalCharsPerLine] = useState(40);

  const addSection = () => {
    const newId = Date.now().toString();
    setSections([...sections, { id: newId, title: `セクション${sections.length + 1}` }]);
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, title } : section
    ));
  };

  const updateSectionContent = (id: string, content: string, maxChars: number) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, content, maxChars } : section
    ));
  };

  const normalizeText = (text: string) => {
    return text
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/[！-～]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code >= 0xFF01 && code <= 0xFF5E) {
          return String.fromCharCode(code - 0xFEE0);
        }
        return char;
      });
  };

  const parseYAML = (yamlText: string): ImportedEssay | null => {
    try {
      // Simple YAML parser for our specific format
      const lines = yamlText.split('\n');
      const result: ImportedEssay = { essay: { sections: [] } };
      let currentSection: ImportedSection | null = null;
      let indent = 0;
      let inContent = false;
      let contentLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const currentIndent = line.length - line.trimStart().length;
        
        if (inContent && currentIndent <= indent) {
          if (currentSection && contentLines.length > 0) {
            currentSection.content = contentLines.join('\n');
            contentLines = [];
          }
          inContent = false;
        }
        
        if (inContent) {
          contentLines.push(line.substring(indent + 2));
          continue;
        }
        
        if (trimmed.includes(': |')) {
          inContent = true;
          indent = currentIndent;
          continue;
        }
        
        const [key, value] = trimmed.split(': ');
        
        if (key === 'essay') {
          result.essay = { sections: [] };
        } else if (key === 'title' && currentIndent === 2) {
          result.essay!.title = value?.replace(/"/g, '') || '';
        } else if (key === 'gridMode') {
          if (!result.essay!.globalSettings) result.essay!.globalSettings = {};
          result.essay!.globalSettings.gridMode = value === 'true';
        } else if (key === 'charsPerLine') {
          if (!result.essay!.globalSettings) result.essay!.globalSettings = {};
          result.essay!.globalSettings.charsPerLine = parseInt(value) || 40;
        } else if (trimmed.startsWith('- id:')) {
          if (currentSection) {
            result.essay!.sections!.push(currentSection);
          }
          currentSection = { id: value?.replace(/"/g, '') || Date.now().toString() };
        } else if (key === 'title' && currentSection) {
          currentSection.title = value?.replace(/"/g, '') || '';
        } else if (key === 'maxCharacters' && currentSection) {
          if (!currentSection.metadata) currentSection.metadata = {};
          currentSection.metadata.maxCharacters = parseInt(value) || 400;
        }
      }
      
      if (currentSection) {
        if (contentLines.length > 0) {
          currentSection.content = contentLines.join('\n');
        }
        result.essay!.sections!.push(currentSection);
      }
      
      return result;
    } catch (error) {
      console.error('YAML parsing error:', error);
      return null;
    }
  };

  const importFromYAML = async () => {
    const confirmed = confirm('既存のセクションはすべて削除され、YAMLファイルの内容で置き換えられます。\n続行しますか？');
    
    if (!confirmed) return;
    
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.yaml,.yml';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const text = await file.text();
        const parsed = parseYAML(text);
        
        if (!parsed?.essay) {
          alert('YAMLファイルの形式が正しくありません');
          return;
        }
        
        const essay = parsed.essay;
        
        // Restore global settings
        if (essay.globalSettings) {
          if (essay.globalSettings.gridMode !== undefined) {
            setGlobalGridMode(essay.globalSettings.gridMode);
          }
          if (essay.globalSettings.charsPerLine !== undefined) {
            setGlobalCharsPerLine(essay.globalSettings.charsPerLine);
          }
        }
        
        // Completely replace sections
        if (essay.sections && essay.sections.length > 0) {
          const newSections: SectionData[] = essay.sections.map((section, index) => {
            let content = section.content || '';
            // Convert to full-width if grid mode is enabled
            if (essay.globalSettings?.gridMode) {
              content = convertToFullWidth(content);
            }
            return {
              id: section.id || Date.now().toString() + index,
              title: section.title || `セクション${index + 1}`,
              content,
              maxChars: section.metadata?.maxCharacters || 400
            };
          });
          
          setSections(newSections);
        } else {
          // If no sections in YAML, create default section
          setSections([{ id: Date.now().toString(), title: 'セクション1' }]);
        }
        
        alert('YAMLファイルからデータを復元しました');
      };
      
      input.click();
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      alert('ファイルの読み込みに失敗しました');
    }
  };

  const exportAllToYAML = async () => {
    const yamlSections = sections.map(section => {
      const normalizedContent = normalizeText(section.content || '');
      return {
        id: section.id,
        title: section.title,
        content: normalizedContent,
        metadata: {
          maxCharacters: section.maxChars || 400
        },
        scoring: {
          maxPoints: null,
          points: null,
          comment: ""
        }
      };
    });

    const sectionStrings = yamlSections.map(section => {
      const contentLines = section.content.split('\n').map(line => `      ${line}`).join('\n');
      return `  - id: "${section.id}"
    title: "${section.title}"
    content: |
${contentLines}
    metadata:
      maxCharacters: ${section.metadata.maxCharacters}
    scoring:
      maxPoints: ${section.scoring.maxPoints}
      points: ${section.scoring.points}
      comment: "${section.scoring.comment}"`;
    });
    
    const yamlString = `essay:
  title: "小論文"
  globalSettings:
    gridMode: ${globalGridMode}
    charsPerLine: ${globalCharsPerLine}
  sections:
${sectionStrings.join('\n')}
  totalScoring:
    maxPoints: null
    points: null
    overallComment: ""`;

    try {
      const blob = new Blob([yamlString], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'essay-output.yaml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ファイルの保存に失敗しました:', err);
      alert('ファイルの保存に失敗しました');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>小論文エディタ</h1>
        <div className="header-controls">
          {globalGridMode && (
            <div className="chars-per-line-control">
              <label>1行: </label>
              <select 
                value={globalCharsPerLine} 
                onChange={(e) => setGlobalCharsPerLine(Number(e.target.value))}
                className="chars-input"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={80}>80</option>
              </select>
            </div>
          )}
          <button 
            onClick={() => setGlobalGridMode(!globalGridMode)} 
            className={`grid-btn ${globalGridMode ? 'active' : ''}`}
          >
            {globalGridMode ? '■ 方眼紙OFF' : '□ 方眼紙ON'}
          </button>
          <button onClick={addSection} className="add-section-btn">
            + セクション追加
          </button>
          <button onClick={importFromYAML} className="import-btn">
            ↑ YAML読み込み
          </button>
          <button onClick={exportAllToYAML} className="export-all-btn">
            ↓ YAML保存
          </button>
        </div>
      </header>
      <main className="app-main">
        {sections.map(section => (
          <Section
            key={section.id}
            id={section.id}
            title={section.title}
            gridMode={globalGridMode}
            charsPerLine={globalCharsPerLine}
            onDelete={deleteSection}
            initialContent={section.content}
            initialMaxChars={section.maxChars}
            onTitleChange={updateSectionTitle}
            onContentChange={updateSectionContent}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
