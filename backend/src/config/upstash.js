import { Client as WorkflowClient} from '@upstash/workflow';

import { QSTASH_TOKEN } from './env.js';

export const workflowClient = new WorkflowClient({ 
    token: QSTASH_TOKEN,
});