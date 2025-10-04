import { useState } from 'react';
import Section from './components/Section';
import './App.css';

interface SectionData {
  id: string;
  title: string;
  content?: string;
  maxChars?: number;
  instruction?: string;
  scoring?: {
    maxPoints?: number | null;
    points?: number | null;
    comment?: string;
  };
}

interface ImportedSection {
  id?: string;
  title?: string;
  content?: string;
  maxCharacters?: number;
  metadata?: {
    instruction?: string;
    scoring?: {
      maxPoints?: number | null;
      points?: number | null;
      comment?: string;
    };
  };
}

interface ImportedEssay {
  essay?: {
    title?: string;
    globalSettings?: {
      timer?: {
        limit?: number;
        elapsed?: number;
      };
      editable?: boolean;
      editable_structure?: boolean;
    };
    metadata?: {
      totalScoring?: {
        maxPoints?: number | null;
        points?: number | null;
        overallComment?: string;
      };
    };
    sections?: ImportedSection[];
  };
}

function App() {
  const [essayTitle, setEssayTitle] = useState('小論文');
  const [sections, setSections] = useState<SectionData[]>([
    { id: '1', title: 'セクション1' }
  ]);
  const [globalGridMode, setGlobalGridMode] = useState(true);
  const [globalCharsPerLine, setGlobalCharsPerLine] = useState(40);
  const [globalSettings, setGlobalSettings] = useState({
    timer: { limit: 0, elapsed: 0 } as { limit?: number; elapsed?: number },
    editable: true,
    editable_structure: true
  });
  const [totalScoring, setTotalScoring] = useState({
    maxPoints: null as number | null,
    points: null as number | null,
    overallComment: ''
  });
  const [submitUrl, setSubmitUrl] = useState('');

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
    const FULL_WIDTH_OFFSET = 0xFEE0;
    const FULL_WIDTH_SYMBOL_START = 0xFF01;
    const FULL_WIDTH_SYMBOL_END = 0xFF5E;
    
    return text
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) - FULL_WIDTH_OFFSET)
      )
      .replace(/[！-～]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code >= FULL_WIDTH_SYMBOL_START && code <= FULL_WIDTH_SYMBOL_END) {
          return String.fromCharCode(code - FULL_WIDTH_OFFSET);
        }
        return char;
      });
  };

  const importFromJSON = async () => {
    const confirmed = confirm('既存のセクションはすべて削除され、JSONファイルの内容で置き換えられます。\n続行しますか？');
    
    if (!confirmed) return;
    
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const text = await file.text();
        let parsed: ImportedEssay;
        
        try {
          parsed = JSON.parse(text);
        } catch (error) {
          alert('JSONファイルの形式が正しくありません');
          return;
        }
        
        if (!parsed?.essay) {
          alert('JSONファイルの形式が正しくありません');
          return;
        }
        
        const essay = parsed.essay;
        
        if (essay.title) setEssayTitle(essay.title);
        
        if (essay.globalSettings) {
          setGlobalSettings({
            timer: {
              limit: essay.globalSettings.timer?.limit ?? 0,
              elapsed: essay.globalSettings.timer?.elapsed ?? 0
            },
            editable: essay.globalSettings.editable ?? true,
            editable_structure: essay.globalSettings.editable_structure ?? true
          });
        }
        
        setTotalScoring({
          maxPoints: essay.metadata?.totalScoring?.maxPoints ?? null,
          points: essay.metadata?.totalScoring?.points ?? null,
          overallComment: essay.metadata?.totalScoring?.overallComment ?? ''
        });
        
        if (essay.sections?.length) {
          const newSections: SectionData[] = essay.sections.map((section: ImportedSection, index: number) => ({
            id: section.id || Date.now().toString() + index,
            title: section.title || `セクション${index + 1}`,
            content: section.content || '',
            maxChars: section.maxCharacters || 400,
            instruction: section.metadata?.instruction,
            scoring: section.metadata?.scoring
          }));
          setSections(newSections);
        } else {
          setSections([{ id: Date.now().toString(), title: 'セクション1' }]);
        }
        
        alert('JSONファイルからデータを復元しました');
      };
      
      input.click();
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      alert('ファイルの読み込みに失敗しました');
    }
  };

  const createJSONData = () => ({
    essay: {
      title: essayTitle,
      globalSettings: {
        timer: {
          limit: globalSettings.timer?.limit ?? 0,
          elapsed: globalSettings.timer?.elapsed ?? 0
        },
        editable: globalSettings.editable,
        editable_structure: globalSettings.editable_structure
      },
      ...(totalScoring.maxPoints !== null || totalScoring.points !== null || totalScoring.overallComment ? {
        metadata: {
          totalScoring: {
            maxPoints: totalScoring.maxPoints,
            points: totalScoring.points,
            overallComment: totalScoring.overallComment
          }
        }
      } : {}),
      sections: sections.map(section => ({
        id: section.id,
        title: section.title,
        content: normalizeText(section.content || ''),
        maxCharacters: section.maxChars || 400,
        metadata: {
          ...(section.instruction && { instruction: section.instruction }),
          ...(section.scoring && {
            scoring: section.scoring
          })
        }
      }))
    }
  });

  const exportAllToJSON = async () => {
    try {
      const jsonString = JSON.stringify(createJSONData(), null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'essay-output.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ファイルの保存に失敗しました:', err);
      alert('ファイルの保存に失敗しました');
    }
  };

  const submitToURL = async () => {
    if (!submitUrl.trim()) {
      alert('URLを入力してください');
      return;
    }

    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createJSONData())
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (responseData?.essay) {
        const essay = responseData.essay;
        
        if (essay.title) setEssayTitle(essay.title);
        
        if (essay.globalSettings) {
          setGlobalSettings({
            timer: {
              limit: essay.globalSettings.timer?.limit ?? 0,
              elapsed: essay.globalSettings.timer?.elapsed ?? 0
            },
            editable: essay.globalSettings.editable ?? true,
            editable_structure: essay.globalSettings.editable_structure ?? true
          });
        }
        
        setTotalScoring({
          maxPoints: essay.metadata?.totalScoring?.maxPoints ?? null,
          points: essay.metadata?.totalScoring?.points ?? null,
          overallComment: essay.metadata?.totalScoring?.overallComment ?? ''
        });
        
        if (essay.sections?.length) {
          const newSections: SectionData[] = essay.sections.map((section: ImportedSection, index: number) => ({
            id: section.id || Date.now().toString() + index,
            title: section.title || `セクション${index + 1}`,
            content: section.content || '',
            maxChars: section.maxCharacters || 400,
            instruction: section.metadata?.instruction,
            scoring: section.metadata?.scoring
          }));
          setSections(newSections);
        }
        
        alert('サーバーからの応答を受信しました');
      } else {
        alert('サーバーからの応答形式が正しくありません');
      }
    } catch (error) {
      console.error('送信エラー:', error);
      alert('送信に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <input 
          type="text" 
          value={essayTitle} 
          onChange={(e) => setEssayTitle(e.target.value)}
          className="app-title-input"
          placeholder="小論文の題名"
          disabled={!globalSettings.editable_structure}
        />
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
          <button 
            onClick={globalSettings.editable_structure ? addSection : undefined} 
            className="add-section-btn"
            disabled={!globalSettings.editable_structure}
          >
            + セクション追加
          </button>
          <input
            type="url"
            value={submitUrl}
            onChange={(e) => setSubmitUrl(e.target.value)}
            placeholder="送信先URL"
            className="url-input"
          />
          <button onClick={submitToURL} className="submit-btn">
            → 送信
          </button>
          <button onClick={importFromJSON} className="import-btn">
            ↑ 読み込み
          </button>
          <button onClick={exportAllToJSON} className="export-all-btn">
            ↓ 保存
          </button>
        </div>
      </header>
      {(totalScoring.maxPoints !== null || totalScoring.points !== null || totalScoring.overallComment) && (
        <div className="total-scoring">
          <h3>全体採点</h3>
          {(totalScoring.maxPoints !== null || totalScoring.points !== null) && (
            <div className="total-score">
              総得点: {totalScoring.points ?? '-'}/{totalScoring.maxPoints ?? '-'}
            </div>
          )}
          {totalScoring.overallComment && (
            <div className="overall-comment">
              <strong>全体講評:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {totalScoring.overallComment}
              </pre>
            </div>
          )}
        </div>
      )}
      <main className="app-main">
        {sections.map(section => (
          <Section
            key={section.id}
            id={section.id}
            title={section.title}
            gridMode={globalGridMode}
            charsPerLine={globalCharsPerLine}
            onDelete={globalSettings.editable_structure ? deleteSection : () => {}}
            canDelete={globalSettings.editable_structure}
            isEditable={globalSettings.editable}
            isTitleEditable={globalSettings.editable_structure}
            initialContent={section.content}
            initialMaxChars={section.maxChars}
            instruction={section.instruction}
            scoring={section.scoring}
            onTitleChange={updateSectionTitle}
            onContentChange={updateSectionContent}
          />
        ))}
      </main>
    </div>
  );
}

export default App;