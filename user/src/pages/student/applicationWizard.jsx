import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import '../../cssPages/student/applicationWizard.css';
import config from '../../config'; // ← ADDED IMPORT

const ApplicationWizard = () => {
  const { scholarshipId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [applicationData, setApplicationData] = useState({
    scholarship_id: scholarshipId || '',
    student_id: 1, // Get from auth context
    requirements: [],
    status: 'draft'
  });
  
  const [scholarshipDetails, setScholarshipDetails] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [applicationId, setApplicationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch scholarship details and requirements
  useEffect(() => {
    if (!scholarshipId) {
      console.log('No scholarship ID provided');
    } else {
      fetchScholarshipDetails(scholarshipId);
      setApplicationData(prev => ({
        ...prev,
        scholarship_id: parseInt(scholarshipId)
      }));
    }
  }, [scholarshipId, navigate]);

  const fetchScholarshipDetails = async (id) => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching scholarship ID:', id);
      
      // CHANGED: Using config.apiBase
      const response = await fetch(`${config.apiBase}/applications/scholarship/${id}`);
      
      console.log('📡 Response status:', response.status);
      
      // First, get the response as text to see what we're actually getting
      const responseText = await response.text();
      console.log('📡 Response text (first 200 chars):', responseText.substring(0, 200));
      
      // Check if it starts with HTML (DOCTYPE)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('❌ Server returned HTML instead of JSON');
        console.error('🔍 Full response:', responseText);
        throw new Error('Server returned HTML page. Check if API endpoint exists.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Now try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Successfully parsed JSON:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('🔍 Response that failed to parse:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      if (data.success) {
        console.log('✅ Scholarship data loaded:', data.scholarship);
        setScholarshipDetails(data.scholarship);
        // Initialize uploaded files state
        const initialFiles = {};
        data.scholarship.requirements.forEach(req => {
          initialFiles[req.requirement_id] = null;
        });
        setUploadedFiles(initialFiles);
      } else {
        throw new Error(data.message || 'Failed to fetch scholarship');
      }
    } catch (error) {
      console.error('❌ Failed to fetch scholarship details:', error);
      alert('Failed to load scholarship details: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1: Create Application
  const handleStartApplication = async () => {
    setIsLoading(true);
    try {
      // CHANGED: Using config.apiBase
      const response = await fetch(`${config.apiBase}/applications/application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });
      const data = await response.json();
      
      if (data.success) {
        setApplicationId(data.application_id);
        setApplicationData(prev => ({
          ...prev,
          application_id: data.application_id
        }));
        setCurrentStep(2);
      } else {
        alert(data.message || 'Failed to start application');
      }
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Failed to start application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Upload Files
  const handleFileUpload = async (requirementId, file) => {
    if (!file || !applicationId) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('requirementId', requirementId);

      // CHANGED: Using config.apiBase
      const response = await fetch(`${config.apiBase}/applications/application/${applicationId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadedFiles(prev => ({
          ...prev,
          [requirementId]: {
            name: file.name,
            type: file.type,
            size: file.size,
            uploaded: true
          }
        }));
        
        setApplicationData(prev => ({
          ...prev,
          requirements: [...prev.requirements, {
            requirement_id: requirementId,
            file_name: file.name,
            uploaded_at: new Date().toISOString()
          }]
        }));
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Final Submission
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      // CHANGED: Using config.apiBase
      const response = await fetch(`${config.apiBase}/applications/application/${applicationId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...applicationData,
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        navigate('/student-dashboard', { 
          state: { 
            message: 'Application submitted successfully!',
            applicationId: applicationId
          }
        });
      } else {
        alert(data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Submission failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const allFilesUploaded = () => {
    return Object.values(uploadedFiles).every(file => file !== null);
  };

  if (isLoading && !scholarshipDetails) {
    return <div className="loading">Loading scholarship details...</div>;
  }

  if (!scholarshipId) {
    return (
      <div className="application-wizard">
        <div className="wizard-step">
          <h2>Select a Scholarship Program</h2>
          <p>Please choose which scholarship you want to apply for.</p>

          <div className="scholarship-selection">
            <div className="scholarship-option">
              <h3>TESDA Grant</h3>
              <p>Technical Education and Skills Development scholarship program.</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/application-wizard/1')}
              >
                Apply for TESDA Grant
              </button>
            </div>

            <div className="scholarship-option">
              <h3>CHED Scholarship</h3>
              <p>Commission on Higher Education financial aid program.</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/application-wizard/2')}
              >
                Apply for CHED Scholarship
              </button>
            </div>

            <div className="scholarship-option">
              <h3>EduKar Program</h3>
              <p>Educational assistance for qualified academic scholars.</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/application-wizard/3')}
              >
                Apply for EduKar Program
              </button>
            </div>

            <div className="scholarship-option">
              <h3>Trinitarian Auxiliary Staff / Working Student</h3>
              <p>Financial aid for working students serving under the Trinitarian Auxiliary Staff program.</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/application-wizard/4')}
              >
                Apply for TAS Program
              </button>
            </div>
          </div>

          <button 
            onClick={() => navigate('/student-dashboard')} 
            className="btn-secondary"
            style={{ marginTop: '1.5rem' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!scholarshipDetails && !isLoading) {
    return (
      <div className="application-wizard">
        <div className="wizard-step">
          <h2>Scholarship Not Found</h2>
          <p>The selected scholarship could not be loaded.</p>
          <button 
            onClick={() => navigate('/student-dashboard')} 
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="application-wizard">
      {/* Progress Indicator */}
      <div className="wizard-progress">
        <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
          1. Select Scholarship
        </div>
        <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
          2. Upload Requirements
        </div>
        <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
          3. Submit Application
        </div>
      </div>

      {/* Step 1: Scholarship Confirmation */}
      {currentStep === 1 && scholarshipDetails && (
        <div className="wizard-step">
          <h2>Start New Application</h2>
          <div className="scholarship-confirmation">
            <h3>{scholarshipDetails.scholarship_name}</h3>
            <p>{scholarshipDetails.description}</p>
            <div className="requirements-preview">
              <h4>Required Documents:</h4>
              <ul>
                {scholarshipDetails.requirements.map(req => (
                  <li key={req.requirement_id}>• {req.requirement_name}</li>
                ))}
              </ul>
            </div>
            <button 
              onClick={handleStartApplication} 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Starting Application...' : 'Start Application & Upload Requirements'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Requirements Upload */}
      {currentStep === 2 && scholarshipDetails && (
        <div className="wizard-step">
          <h2>Upload Required Documents</h2>
          <p className="scholarship-name">For: <strong>{scholarshipDetails.scholarship_name}</strong></p>
          
          <div className="requirements-list">
            {scholarshipDetails.requirements.map(requirement => (
              <div key={requirement.requirement_id} className="requirement-item">
                <div className="requirement-info">
                  <h4>{requirement.requirement_name}</h4>
                  <p className="requirement-desc">{requirement.description}</p>
                </div>
                <div className="file-upload-section">
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(requirement.requirement_id, e.target.files[0])}
                    className="file-input"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {uploadedFiles[requirement.requirement_id] && (
                    <span className="upload-success">
                      ✓ {uploadedFiles[requirement.requirement_id].name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="wizard-actions">
            <button 
              onClick={() => setCurrentStep(1)} 
              className="btn-secondary"
            >
              Back
            </button>
            <button 
              onClick={() => setCurrentStep(3)} 
              disabled={!allFilesUploaded() || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Processing...' : 'Review and Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Final Review & Submission */}
      {currentStep === 3 && scholarshipDetails && (
        <div className="wizard-step">
          <h2>Review Your Application</h2>
          <div className="application-review">
            <h3>Scholarship: {scholarshipDetails.scholarship_name}</h3>
            <div className="uploaded-files-review">
              <h4>Uploaded Documents:</h4>
              <ul>
                {scholarshipDetails.requirements.map(requirement => (
                  <li key={requirement.requirement_id}>
                    ✓ {requirement.requirement_name}:{' '}
                    <span className="file-name">
                      {uploadedFiles[requirement.requirement_id]?.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="wizard-actions">
              <button 
                onClick={() => setCurrentStep(2)} 
                className="btn-secondary"
              >
                Back to Upload
              </button>
              <button 
                onClick={handleFinalSubmit} 
                disabled={isLoading}
                className="btn-success"
              >
                {isLoading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationWizard;