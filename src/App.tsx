import { useState } from 'react';
import Section from './components/Section';
import './App.css';

interface SectionData {
  id: string;
  title: string;
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
            {globalGridMode ? '方眼紙OFF' : '方眼紙ON'}
          </button>
          <button onClick={addSection} className="add-section-btn">
            セクション追加
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
            onTitleChange={updateSectionTitle}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
