import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ClientLogin from './pages/client/clientLogin';
import AdminLogin from './pages/admin/adminLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ClientLogin />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
      </Routes>
    </Router>
  );
}

export default App;
