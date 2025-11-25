import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectList from './components/ProjectList';
import ProjectViewer from './components/ProjectViewer';
import IngestProject from './components/IngestProject';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectViewer />} />
        <Route path="/ingest" element={<IngestProject />} />
      </Routes>
    </Router>
  );
}

export default App;
