import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import '../../cssPages/admin/adminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    // Real data from your database
    students: [],
    applications: [],
    scholarships: [],
    requirements: [],
    submittedRequirements: []
  });

  // Fetch real data from your API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Use correct admin API endpoints
        const [studentsRes, applicationsRes, scholarshipsRes, requirementsRes] = await Promise.all([
          fetch('http://localhost:5000/api/admin/students'),
          fetch('http://localhost:5000/api/admin/applications'),
          fetch('http://localhost:5000/api/admin/scholarships'),
          fetch('http://localhost:5000/api/admin/requirements')
        ]);

        const studentsData = await studentsRes.json();
        const applicationsData = await applicationsRes.json();
        const scholarshipsData = await scholarshipsRes.json();
        const requirementsData = await requirementsRes.json();

        setDashboardData({
          students: studentsData.success ? studentsData.students : [],
          applications: applicationsData.success ? applicationsData.applications : [],
          scholarships: scholarshipsData.success ? scholarshipsData.scholarships : [],
          requirements: requirementsData.success ? requirementsData.requirements : [],
          submittedRequirements: []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty arrays on error to prevent crashes
        setDashboardData({
          students: [],
          applications: [],
          scholarships: [],
          requirements: [],
          submittedRequirements: []
        });
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate stats from real data
  const stats = {
    totalStudents: dashboardData.students.length,
    totalApplications: dashboardData.applications.length,
    pendingApplications: dashboardData.applications.filter(app => app.status === 'Pending').length,
    totalScholarships: dashboardData.scholarships.length
  };

  // Recent applications for quick review
  const recentApplications = dashboardData.applications
    .sort((a, b) => new Date(b.date_applied) - new Date(a.date_applied))
    .slice(0, 5);

  // Handle actions
  const handleView = (type, id) => {
    navigate(`/admin/${type}/${id}`);
  };

  const handleEdit = (type, id) => {
    navigate(`/admin/${type}/edit/${id}`);
  };

  const handleDelete = async (type, id) => {
    if (window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/admin/${type}/${id}`, { 
          method: 'DELETE' 
        });
        
        if (response.ok) {
          // Refresh data or update state
          setDashboardData(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item[`${type.slice(0, -1)}_id`] !== id)
          }));
          alert(`${type.slice(0, -1)} deleted successfully`);
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting item');
      }
    }
  };

  // Handle application status updates
  const handleAcceptApplication = async (applicationId) => {
    const remarks = prompt('Add remarks for acceptance (optional):');
    const score = prompt('Add evaluation score (1-100, optional):');
    
    // Always create evaluation record (with or without score)
    const evaluationScore = score && !isNaN(score) ? parseInt(score) : null;
    await createEvaluation(applicationId, evaluationScore, remarks || 'Application approved');
    
    await updateApplicationStatus(applicationId, 'Approved', remarks || 'Application approved by admin');
  };

  const handleRejectApplication = async (applicationId) => {
    const remarks = prompt('Add reason for rejection:');
    if (remarks) {
      // Create evaluation record for rejection
      await createEvaluation(applicationId, 0, remarks); // Score 0 for rejected applications
      await updateApplicationStatus(applicationId, 'Rejected', remarks);
    }
  };

  const createEvaluation = async (applicationId, score, comments) => {
    try {
      // Get actual admin credentials from localStorage
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const evaluatorName = currentUser ? currentUser.username : 'Unknown Admin';

      console.log('Creating evaluation by:', evaluatorName);

      const response = await fetch(`http://localhost:5000/api/admin/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          evaluator_name: evaluatorName, // Now uses actual admin username
          score: score,
          comments: comments || 'No additional comments'
        }),
      });

      if (!response.ok) {
        console.error('Failed to create evaluation');
      } else {
        console.log('Evaluation created successfully by:', evaluatorName);
      }
    } catch (error) {
      console.error('Error creating evaluation:', error);
    }
  };

  const updateApplicationStatus = async (applicationId, status, remarks) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, remarks }),
      });

      if (response.ok) {
        // Update the application in state
        setDashboardData(prev => ({
          ...prev,
          applications: prev.applications.map(app => 
            app.application_id === applicationId 
              ? { ...app, status, remarks }
              : app
          )
        }));
        alert(`Application ${status.toLowerCase()} successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Error updating application status');
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Manage Scholarship Applications</p>
        </div>
        <button
          className="logout-btn"
          onClick={() => navigate('/user-login')}
        >
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        {/* Quick Stats */}
        <div className="stats-grid">
        <div className="stat-card" onClick={() => setActiveTab('students')}>
          <div className="stat-content">
            <div className="stat-icon stat-icon-blue">👥</div>
            <div className="stat-text">
              <p className="stat-label">Total Students</p>
              <p className="stat-value">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('applications')}>
          <div className="stat-content">
            <div className="stat-icon stat-icon-purple">📋</div>
            <div className="stat-text">
              <p className="stat-label">Applications</p>
              <p className="stat-value">{stats.totalApplications}</p>
            </div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('applications')}>
          <div className="stat-content">
            <div className="stat-icon stat-icon-orange">⏳</div>
            <div className="stat-text">
              <p className="stat-label">Pending</p>
              <p className="stat-value">{stats.pendingApplications}</p>
            </div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('scholarships')}>
          <div className="stat-content">
            <div className="stat-icon stat-icon-green">🎯</div>
            <div className="stat-text">
              <p className="stat-label">Scholarships</p>
              <p className="stat-value">{stats.totalScholarships}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'applications' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications
          </button>
          <button 
            className={`tab ${activeTab === 'students' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button 
            className={`tab ${activeTab === 'scholarships' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('scholarships')}
          >
            Scholarships
          </button>
          <button 
            className={`tab ${activeTab === 'requirements' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('requirements')}
          >
            Requirements
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="grid-2-col">
              {/* Recent Applications */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Recent Applications</h2>
                  <button 
                    className="view-all-btn"
                    onClick={() => setActiveTab('applications')}
                  >
                    View All →
                  </button>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Scholarship</th>
                        <th>Date Applied</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApplications.map((app) => (
                        <tr key={app.application_id}>
                          <td>
                            {app.first_name} {app.last_name}
                          </td>
                          <td>
                            {app.scholarship_name}
                          </td>
                          <td>{new Date(app.date_applied).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge status-${app.status?.toLowerCase()}`}>
                              {app.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn-view"
                                onClick={() => handleView('applications', app.application_id)}
                              >
                                View
                              </button>
                              {app.status === 'Pending' && (
                                <>
                                  <button 
                                    className="btn-accept"
                                    onClick={() => handleAcceptApplication(app.application_id)}
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    className="btn-reject"
                                    onClick={() => handleRejectApplication(app.application_id)}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button 
                                className="btn-edit"
                                onClick={() => handleEdit('applications', app.application_id)}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <h2 className="card-title">Quick Actions</h2>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-btn"
                    onClick={() => setActiveTab('applications')}
                  >
                    <span className="action-icon">📋</span>
                    Review Applications
                  </button>
                  <button 
                    className="quick-action-btn"
                    onClick={() => navigate('/admin/requirements/new')}
                  >
                    <span className="action-icon">📄</span>
                    Add Requirement
                  </button>
                  <button 
                    className="quick-action-btn"
                    onClick={() => navigate('/admin/scholarships/new')}
                  >
                    <span className="action-icon">🎯</span>
                    Add Scholarship
                  </button>
                  <button 
                    className="quick-action-btn"
                    onClick={() => navigate('/admin/reports')}
                  >
                    <span className="action-icon">📊</span>
                    Generate Reports
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">All Applications</h2>
              <p className="card-subtitle">Review and manage student applications</p>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student</th>
                    <th>Scholarship</th>
                    <th>Date Applied</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.applications.map((app) => (
                    <tr key={app.application_id}>
                      <td>{app.application_id}</td>
                      <td>
                        {app.first_name} {app.last_name}
                      </td>
                      <td>
                        {app.scholarship_name}
                      </td>
                      <td>{new Date(app.date_applied).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${app.status?.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{app.remarks || '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-view"
                            onClick={() => handleView('applications', app.application_id)}
                          >
                            View
                          </button>
                          {app.status === 'Pending' && (
                            <>
                              <button 
                                className="btn-accept"
                                onClick={() => handleAcceptApplication(app.application_id)}
                              >
                                Accept
                              </button>
                              <button 
                                className="btn-reject"
                                onClick={() => handleRejectApplication(app.application_id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit('applications', app.application_id)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete('applications', app.application_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Student Management</h2>
              <p className="card-subtitle">View and manage registered students</p>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Program</th>
                    <th>Year Level</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.students.map((student) => (
                    <tr key={student.student_id}>
                      <td>{student.student_number}</td>
                      <td>{student.first_name} {student.last_name}</td>
                      <td>{student.program}</td>
                      <td>{student.year_level}</td>
                      <td>{student.email_address}</td>
                      <td>{student.contact_number}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-view"
                            onClick={() => handleView('students', student.student_id)}
                          >
                            View
                          </button>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit('students', student.student_id)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete('students', student.student_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scholarships Tab */}
        {activeTab === 'scholarships' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Scholarship Management</h2>
              <button 
                className="btn-primary"
                onClick={() => navigate('/admin/scholarships/new')}
              >
                + Add New
              </button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Sponsor</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.scholarships.map((scholarship) => (
                    <tr key={scholarship.scholarship_id}>
                      <td>{scholarship.scholarship_name}</td>
                      <td>{scholarship.type}</td>
                      <td>{scholarship.sponsor}</td>
                      <td className="truncate-text">{scholarship.description}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-view"
                            onClick={() => handleView('scholarships', scholarship.scholarship_id)}
                          >
                            View
                          </button>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit('scholarships', scholarship.scholarship_id)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete('scholarships', scholarship.scholarship_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Requirements Tab */}
        {activeTab === 'requirements' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Requirements Management</h2>
              <button 
                className="btn-primary"
                onClick={() => navigate('/admin/requirements/new')}
              >
                + Add New
              </button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requirement Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.requirements.map((requirement) => (
                    <tr key={requirement.requirement_id}>
                      <td>{requirement.requirement_name}</td>
                      <td>{requirement.description}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit('requirements', requirement.requirement_id)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete('requirements', requirement.requirement_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;