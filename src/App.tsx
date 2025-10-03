import { useState } from 'react';
import Section from './components/Section';
import './App.css';

interface SectionData {
  id: string;
  title: string;
  content?: string;
  maxChars?: number;
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
      timer?: {
        limit?: number;
        elapsed?: number;
      };
      editable?: boolean;
      editable_structure?: boolean;
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

  const parseYAML = (yamlText: string): ImportedEssay | null => {
    if (!yamlText?.trim()) {
      console.error('Empty YAML content');
      return null;
    }
    
    try {
      const lines = yamlText.split('\n');
      const result: ImportedEssay = { essay: { sections: [] } };
      let currentSection: ImportedSection | null = null;
      let inTotalScoring = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed === 'totalScoring:') {
          if (currentSection) {
            result.essay!.sections!.push(currentSection);
            currentSection = null;
          }
          inTotalScoring = true;
          if (!result.essay!.totalScoring) result.essay!.totalScoring = {};
          continue;
        }
        
        if (trimmed === 'globalSettings:') {
          if (!result.essay!.globalSettings) result.essay!.globalSettings = {};
          continue;
        }
        
        if (trimmed.startsWith('- id:')) {
          inTotalScoring = false;
          if (currentSection) {
            result.essay!.sections!.push(currentSection);
          }
          const id = trimmed.split('"')[1] || Date.now().toString();
          currentSection = { id };
          continue;
        }
        
        const [key, ...valueParts] = trimmed.split(': ');
        const value = valueParts.join(': ');
        
        if (inTotalScoring) {
          if (key === 'maxPoints') {
            result.essay!.totalScoring!.maxPoints = parseInt(value) || null;
          } else if (key === 'points') {
            result.essay!.totalScoring!.points = parseInt(value) || null;
          } else if (key === 'overallComment') {
            if (value.includes('|')) {
              // Multi-line comment
              let comment = '';
              for (let j = i + 1; j < lines.length; j++) {
                const commentLine = lines[j];
                if (commentLine.trim() && !commentLine.startsWith('    ')) break;
                if (commentLine.startsWith('    ')) {
                  comment += commentLine.substring(4).trimStart() + '\n';
                }
              }
              result.essay!.totalScoring!.overallComment = comment.trim();
            } else {
              result.essay!.totalScoring!.overallComment = value.replace(/"/g, '');
            }
          }
        } else if (trimmed === 'timer:') {
          if (!result.essay!.globalSettings) result.essay!.globalSettings = {};
          if (!result.essay!.globalSettings.timer) result.essay!.globalSettings.timer = {};
        } else if (key === 'limit') {
          if (result.essay!.globalSettings?.timer) {
            result.essay!.globalSettings.timer.limit = parseInt(value) || 0;
          }
        } else if (key === 'elapsed') {
          if (result.essay!.globalSettings?.timer) {
            result.essay!.globalSettings.timer.elapsed = parseInt(value) || 0;
          }
        } else if (key === 'editable') {
          if (!result.essay!.globalSettings) result.essay!.globalSettings = {};
          result.essay!.globalSettings.editable = value === 'true';
        } else if (key === 'editable_structure') {
          if (!result.essay!.globalSettings) result.essay!.globalSettings = {};
          result.essay!.globalSettings.editable_structure = value === 'true';
        } else if (key === 'title' && currentSection) {
          currentSection.title = value.replace(/"/g, '');
        } else if (key === 'maxCharacters' && currentSection) {
          if (!currentSection.metadata) currentSection.metadata = {};
          currentSection.metadata.maxCharacters = parseInt(value) || 400;
        } else if (key === 'content' && value.includes('|')) {
          // Multi-line content
          let content = '';
          for (let j = i + 1; j < lines.length; j++) {
            const contentLine = lines[j];
            // Stop when we hit metadata: or any line with 6 spaces that contains a colon
            if (contentLine.trim() && (contentLine.startsWith('      ') && contentLine.includes(':'))) {
              break;
            }
            if (contentLine.startsWith('        ')) {
              content += contentLine.substring(8) + '\n';
            }
          }
          if (currentSection) currentSection.content = content.replace(/\n+$/, '');
        } else if (key === 'maxPoints' && currentSection) {
          if (!currentSection.scoring) currentSection.scoring = {};
          currentSection.scoring.maxPoints = parseInt(value) || null;
        } else if (key === 'points' && currentSection) {
          if (!currentSection.scoring) currentSection.scoring = {};
          currentSection.scoring.points = parseInt(value) || null;
        } else if (key === 'comment' && currentSection && value.includes('|')) {
          if (!currentSection.scoring) currentSection.scoring = {};
          // Multi-line comment
          let comment = '';
          for (let j = i + 1; j < lines.length; j++) {
            const commentLine = lines[j];
            if (commentLine.trim() && !commentLine.startsWith('          ') && !commentLine.startsWith('    - id:') && commentLine.includes(':')) {
              break;
            }
            if (commentLine.startsWith('          ')) {
              comment += commentLine.substring(10) + '\n';
            }
          }
          currentSection.scoring.comment = comment.trim();
        } else if (key === 'comment' && currentSection) {
          if (!currentSection.scoring) currentSection.scoring = {};
          currentSection.scoring.comment = value.replace(/"/g, '');
        }
      }
      
      if (currentSection) {
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
        
        // Restore global settings (excluding gridMode and charsPerLine)
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
        
        // Restore total scoring
        setTotalScoring({
          maxPoints: essay.totalScoring?.maxPoints ?? null,
          points: essay.totalScoring?.points ?? null,
          overallComment: essay.totalScoring?.overallComment ?? ''
        });
        
        // Completely replace sections
        if (essay.sections && essay.sections.length > 0) {
          const newSections: SectionData[] = essay.sections.map((section, index) => {
            return {
              id: section.id || Date.now().toString() + index,
              title: section.title || `セクション${index + 1}`,
              content: section.content || '',
              maxChars: section.metadata?.maxCharacters || 400,
              scoring: section.scoring
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
        scoring: section.scoring || {
          maxPoints: null,
          points: null,
          comment: ""
        }
      };
    });

    const escapeYamlString = (str: string) => {
      return str.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    };
    
    const sectionStrings = yamlSections.map(section => {
      const contentLines = section.content.split('\n').map(line => `        ${escapeYamlString(line)}`).join('\n');
      const scoringComment = section.scoring.comment ? section.scoring.comment.split('\n').map(line => `          ${escapeYamlString(line)}`).join('\n') : '';
      
      return `    - id: "${escapeYamlString(section.id)}"
      title: "${escapeYamlString(section.title)}"
      content: |
${contentLines}
      metadata:
        maxCharacters: ${section.metadata.maxCharacters}${section.scoring.maxPoints !== null || section.scoring.points !== null || section.scoring.comment ? `
      scoring:
        maxPoints: ${section.scoring.maxPoints}
        points: ${section.scoring.points}
        comment: |${scoringComment ? '\n' + scoringComment : ''}` : ''}`;
    });
    
    const hasGlobalSettings = globalSettings.timer?.limit || globalSettings.timer?.elapsed || 
                             globalSettings.editable !== true || globalSettings.editable_structure !== true;
    
    let globalSettingsStr = '';
    if (hasGlobalSettings) {
      globalSettingsStr = '  globalSettings:\n';
      if (globalSettings.timer?.limit || globalSettings.timer?.elapsed) {
        globalSettingsStr += `    timer:\n      limit: ${globalSettings.timer.limit}\n      elapsed: ${globalSettings.timer.elapsed}\n`;
      }
      if (globalSettings.editable !== true) {
        globalSettingsStr += `    editable: ${globalSettings.editable}\n`;
      }
      if (globalSettings.editable_structure !== true) {
        globalSettingsStr += `    editable_structure: ${globalSettings.editable_structure}\n`;
      }
    }
    
    const hasTotalScoring = totalScoring.maxPoints !== null || totalScoring.points !== null || totalScoring.overallComment;
    
    let totalScoringStr = '';
    if (hasTotalScoring) {
      totalScoringStr = '  totalScoring:\n';
      if (totalScoring.maxPoints !== null) totalScoringStr += `    maxPoints: ${totalScoring.maxPoints}\n`;
      if (totalScoring.points !== null) totalScoringStr += `    points: ${totalScoring.points}\n`;
      if (totalScoring.overallComment) {
        const commentLines = totalScoring.overallComment.split('\n').map(line => `      ${escapeYamlString(line)}`).join('\n');
        totalScoringStr += `    overallComment: |\n${commentLines}`;
      }
    }
    
    const yamlString = `essay:
  title: "小論文"
${globalSettingsStr}  sections:
${sectionStrings.join('\n')}${totalScoringStr ? '\n' + totalScoringStr : ''}`;

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
          <button 
            onClick={globalSettings.editable_structure ? addSection : undefined} 
            className="add-section-btn"
            disabled={!globalSettings.editable_structure}
          >
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
            initialContent={section.content}
            initialMaxChars={section.maxChars}
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
