export interface Space {
  id: string;
  name: string;
  framework: 'gradio' | 'streamlit' | 'docker' | 'static';
  status: 'building' | 'deployed' | 'failed';
  url: string;
  lastUpdated: string;
}

export interface Provider {
  name: string;
  status: 'connected' | 'disconnected';
  apiKey?: string;
}

export interface WorkflowStep {
  tool: string;
  params: Record<string, any>;
}

export interface Workflow {
  name: string;
  steps: WorkflowStep[];
}
