// API Configuration
const config = {
  // In development: connect to local backend on port 5000
  // In production: use relative path (same domain)
  apiBase: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000/api' 
    : '/api'
};

export default config;