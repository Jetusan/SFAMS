import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UserLogin from './userLogin';
import StudentDashboard from './pages/student/studentDashboard';
import ApplicationWizard from './pages/student/applicationWizard';
import ScholarshipCatalog from './pages/student/scholarshipCatalog';
import AdminDashboard from './pages/admin/adminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserLogin />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/apply" element={<ScholarshipCatalog />} />
        <Route path="/scholarships" element={<ScholarshipCatalog />} />
        <Route path="/application-wizard/:scholarshipId?" element={<ApplicationWizard />} />
      </Routes>
    </Router>
  );
}

export default App;
