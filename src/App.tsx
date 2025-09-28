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
        <button onClick={addSection} className="add-section-btn">
          セクション追加
        </button>
      </header>
      <main className="app-main">
        {sections.map(section => (
          <Section
            key={section.id}
            id={section.id}
            title={section.title}
            onDelete={deleteSection}
            onTitleChange={updateSectionTitle}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
