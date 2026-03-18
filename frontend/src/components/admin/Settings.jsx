// src/components/admin/Settings.jsx
import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Loader2, CheckCircle, 
  AlertTriangle, X, Database, BookOpen 
} from 'lucide-react';
import axios from 'axios';

const Settings = ({ token }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    lastUpdated: null
  });
  
  const fileInputRef = useRef(null);
  const API_URL = 'http://127.0.0.1:8000';

  // Fetch document stats on component mount
  React.useEffect(() => {
    fetchDocumentStats();
  }, []);

  const fetchDocumentStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/documents/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Filter only PDF files
    const pdfFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Only PDF files are allowed. Non-PDF files were ignored.');
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(
        `${API_URL}/admin/documents/upload`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress({ overall: percentCompleted });
          }
        }
      );

      setUploadedFiles(response.data.processed_files || []);
      setSuccess(`Successfully uploaded and processed ${response.data.processed_files?.length || files.length} PDF(s)`);
      setFiles([]);
      
      // Refresh stats
      await fetchDocumentStats();
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setUploadProgress({});
      }, 3000);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Failed to upload PDFs. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all documents from the vector database?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/documents/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('All documents cleared from vector database');
      setStats({
        totalDocuments: 0,
        totalChunks: 0,
        lastUpdated: null
      });
    } catch (err) {
      console.error('Error clearing documents:', err);
      setError('Failed to clear documents');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      
      {/* Document Statistics */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-gray-600" />
          Vector Database Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Documents</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalDocuments}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Chunks</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalChunks}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-lg font-semibold text-gray-800">
              {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      </div>
      
      {/* PDF Upload Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-gray-600" />
          Upload PDF Documents
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Upload PDF files to add to the knowledge base. The system will process and store them in the vector database for RAG retrieval.
        </p>
        
        {/* File Drop Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">Click to select PDF files or drag and drop</p>
          <p className="text-xs text-gray-400">Supported format: PDF only</p>
        </div>
        
        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Selected Files ({files.length})</h4>
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload Progress */}
        {uploadProgress.overall > 0 && uploadProgress.overall < 100 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress.overall}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.overall}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Error/Success Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-600">{success}</span>
          </div>
        )}
        
        {/* Uploaded Files Summary */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Processed Files:</h4>
            <ul className="space-y-1">
              {uploadedFiles.map((file, idx) => (
                <li key={idx} className="text-xs text-blue-600 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload & Process PDFs</span>
              </>
            )}
          </button>
          
          {stats.totalDocuments > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              Clear All Documents
            </button>
          )}
        </div>
      </div>
      
      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">How it works</h4>
            <p className="text-xs text-blue-700">
              Uploaded PDFs are processed, split into chunks, and converted to embeddings using 
              a sentence transformer model. These embeddings are stored in a vector database 
              (ChromaDB/Faiss). When users ask questions, the system retrieves relevant chunks 
              and uses them as context for the LLM to generate accurate answers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;