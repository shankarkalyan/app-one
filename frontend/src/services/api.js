import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Application endpoints
export const createApplication = async (data) => {
  const response = await api.post('/applications', data);
  return response.data;
};

export const getApplications = async (page = 1, pageSize = 10, status = null) => {
  const params = { page, page_size: pageSize };
  if (status) params.status = status;
  const response = await api.get('/applications', { params });
  return response.data;
};

export const getApplication = async (applicationId) => {
  const response = await api.get(`/applications/${applicationId}`);
  return response.data;
};

// Workflow graph
export const getWorkflowGraph = async (applicationId) => {
  const response = await api.get(`/applications/${applicationId}/graph`);
  return response.data;
};

// Executions
export const getAgentExecutions = async (applicationId, agentName = null) => {
  const params = agentName ? { agent_name: agentName } : {};
  const response = await api.get(`/applications/${applicationId}/executions`, { params });
  return response.data;
};

// Transactions
export const getTransactionLogs = async (applicationId, eventType = null, limit = 100) => {
  const params = { limit };
  if (eventType) params.event_type = eventType;
  const response = await api.get(`/applications/${applicationId}/transactions`, { params });
  return response.data;
};

// Human tasks
export const getHumanTasks = async (applicationId, status = null) => {
  const params = status ? { status } : {};
  const response = await api.get(`/applications/${applicationId}/human-tasks`, { params });
  return response.data;
};

export const completeHumanTask = async (applicationId, taskId, data) => {
  const response = await api.post(`/applications/${applicationId}/human-tasks/${taskId}/complete`, data);
  return response.data;
};

export const manualUpdateTaskStatus = async (applicationId, taskId, data) => {
  const response = await api.post(`/applications/${applicationId}/human-tasks/${taskId}/manual-update`, data);
  return response.data;
};

// Manual phase/stage updates
export const manualUpdatePhase = async (applicationId, data) => {
  const response = await api.post(`/applications/${applicationId}/manual-phase-update`, data);
  return response.data;
};

export const getAvailablePhases = async (applicationId) => {
  const response = await api.get(`/applications/${applicationId}/available-phases`);
  return response.data;
};

// Complete current task (populates data and moves to next phase)
export const completeCurrentTask = async (applicationId, updatedBy = 'UI User') => {
  const response = await api.post(`/applications/${applicationId}/complete-current-task`, null, {
    params: { updated_by: updatedBy }
  });
  return response.data;
};

// Mock API calls
export const getMockApiCalls = async (applicationId, apiName = null) => {
  const params = apiName ? { api_name: apiName } : {};
  const response = await api.get(`/applications/${applicationId}/api-calls`, { params });
  return response.data;
};

// Simulation
export const simulateDocumentReturn = async (applicationId) => {
  const response = await api.post(`/applications/${applicationId}/simulate-document-return`);
  return response.data;
};

// Health
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Data Management
export const flushAllApplications = async () => {
  const response = await api.post('/data/flush-all');
  return response.data;
};

// Aliases for convenience
export const getExecutions = getAgentExecutions;
export const getTransactions = getTransactionLogs;

export default api;
