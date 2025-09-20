import React from 'react';
import TextEditor from './components/TextEditor';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>小論文エディタ</h1>
      </header>
      <main className="app-main">
        <TextEditor />
      </main>
    </div>
  );
}

export default App;
