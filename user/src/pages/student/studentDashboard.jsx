import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import '../../cssPages/student/studentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    applicationStats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    },
    recentApplications: [],
    pendingRequirements: [],
    notifications: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  // Fetch real data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Set student ID for testing (you can remove this later when login is implemented)
        localStorage.setItem('studentId', '1');
        
        // Get student ID from localStorage or context (assuming it's stored after login)
        const studentId = localStorage.getItem('studentId') || '1'; // Default to 1 for testing
        console.log('Fetching dashboard data for student ID:', studentId);
        
        const response = await fetch(`http://localhost:5000/api/applications/student/${studentId}/dashboard`);
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response data:', result);
        
        if (result.success) {
          setDashboardData({
            applicationStats: result.data.applicationStats,
            recentApplications: result.data.recentApplications,
            pendingRequirements: result.data.pendingRequirements,
            notifications: [] // You can add notifications later
          });
        } else {
          console.error('Failed to fetch dashboard data:', result.message);
          // Keep default empty state
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Keep default empty state on error
      }
    };

    fetchDashboardData();
  }, []);

  const handleViewApplication = async (applicationId) => {
    try {
      setIsModalLoading(true);
      setIsModalOpen(true);

      const response = await fetch(`http://localhost:5000/api/applications/application/${applicationId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSelectedApplication(result.application);
      } else {
        console.error('Failed to fetch application details:', result.message);
        setSelectedApplication(null);
      }
    } catch (error) {
      console.error('Error loading application details:', error);
      setSelectedApplication(null);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplication(null);
  };

  const handleEditApplication = (application) => {
    if (!application) return;
    // Navigate to the application wizard with the same scholarship to continue editing
    navigate(`/application-wizard/${application.scholarship_id}?applicationId=${application.application_id}`);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Student Dashboard</h1>
          <p className="dashboard-subtitle">Scholarship Management System</p>
        </div>
        <button
          className="logout-btn"
          onClick={() => navigate('/user-login')}
        >
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        {/* Congratulatory Message for Approved Applications */}
        {dashboardData.applicationStats.approved > 0 && (
          <div className="success-message">
            <div className="success-icon">🎉</div>
            <div className="success-content">
              <h3>Congratulations!</h3>
              <p>You have {dashboardData.applicationStats.approved} approved scholarship application{dashboardData.applicationStats.approved > 1 ? 's' : ''}. Check your applications below for details.</p>
              <div className="next-steps">
                <h4>Next Steps:</h4>
                <ul>
                  <li>📧 Check your email for official notification and instructions</li>
                  <li>📋 Complete any additional forms if required</li>
                  <li>🏦 Provide bank details for scholarship disbursement</li>
                  <li>📞 Contact the scholarship office if you have questions</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <div className="stat-number">{dashboardData.applicationStats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{dashboardData.applicationStats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-item approved-stat">
            <div className="stat-number">{dashboardData.applicationStats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{dashboardData.applicationStats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        {/* Main Table - My Applications */}
        <div className="table-section">
          <div className="table-header-section">
            <h2>My Scholarship Applications</h2>
            <button 
              className="action-btn primary"
              onClick={() => navigate('/application-wizard')}
            >
              + New Application
            </button>
          </div>
          
          <div className="excel-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Scholarship Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date Applied</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentApplications.map((app, index) => (
                  <tr key={app.application_id}>
                    <td>{index + 1}</td>
                    <td className="scholarship-name">{app.scholarship_name}</td>
                    <td>{app.scholarship_type}</td>
                    <td>
                      <span className={`status-badge ${app.status.toLowerCase().replace(' ', '-')}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>{new Date(app.date_applied).toLocaleDateString()}</td>
                    <td className="remarks">{app.remarks || '-'}</td>
                    <td>
                      <button
                        className="action-btn small"
                        onClick={() => handleViewApplication(app.application_id)}
                      >
                        View
                      </button>
                      <button
                        className="action-btn small"
                        onClick={() => handleEditApplication(app)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dashboardData.recentApplications.length === 0 && (
              <div className="no-data">No applications found. Click "New Application" to get started.</div>
            )}
          </div>
        </div>

        {/* Additional sections removed per request */}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Details</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            {isModalLoading && (
              <div className="modal-loading">Loading details...</div>
            )}

            {!isModalLoading && selectedApplication && (
              <div className="modal-body">
                <div className="modal-section">
                  <h3>{selectedApplication.scholarship_name}</h3>
                  <p className="modal-subtext">Type: {selectedApplication.scholarship_type}</p>
                  <p className="modal-subtext">Status: {selectedApplication.status}</p>
                  <p className="modal-subtext">Remarks: {selectedApplication.remarks || '—'}</p>
                  <p className="modal-subtext">Date Applied: {selectedApplication.date_applied ? new Date(selectedApplication.date_applied).toLocaleDateString() : '—'}</p>
                </div>

                <div className="modal-section">
                  <h4>Submitted Requirements</h4>
                  <div className="modal-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Requirement</th>
                          <th>Status</th>
                          <th>Date Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApplication.requirements && selectedApplication.requirements.length > 0 ? (
                          selectedApplication.requirements.map((req) => (
                            <tr key={req.requirement_id}>
                              <td>{req.requirement_name}</td>
                              <td>{req.submission_status || 'Not Submitted'}</td>
                              <td>{req.date_submitted ? new Date(req.date_submitted).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="modal-empty">No requirements submitted yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!isModalLoading && !selectedApplication && (
              <div className="modal-error">Unable to load application details. Please try again later.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;