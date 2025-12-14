import { setReponse,getResponse, sleep } from './utilResponse';
let loop = 0;
// Utility functions for node updates
const updateNodeStatus = (node, setNodes, status, message = '') => {
  setNodes(nodes => 
    nodes.map(n => n.id === node.id 
      ? { ...n, status: status, lastExecuted: new Date(), message }
      : n
    )
  );
};

const logExecution = (handlerName, node, result) => {
  //console.log(`[${handlerName}] Node ${node.id} executed:`, result);
};

// Core workflow handlers
const triggerHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Trigger activated');
  //await new Promise(resolve => setTimeout(resolve, 1000));
  await sleep(1000)
  const result = {
    completed: true,
    timestamp: new Date().toISOString(),
    nodeId: node.id,
    data: data || {}
  };
  
  updateNodeStatus(node, setNodes, 'success', 'Trigger executed successfully');
  logExecution('Trigger', node, result);
  return result;
};

const scheduleHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Schedule processing');
  
  const schedule = node.function?.schedule || '0 0 * * *'; // Default daily at midnight
  const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day
  
  const result = {
    scheduled: true,
    cron: schedule,
    nextRun: nextRun.toISOString(),
    data: data
  };
  
  updateNodeStatus(node, setNodes, 'scheduled', `Next run: ${nextRun.toLocaleString()}`);
  logExecution('Schedule', node, result);
  return result;
};

const timeOutHandler = async (node, setNodes, setIsExecuting, data) => {
  const timeout = node?.function?.Timeout || 2;
  updateNodeStatus(node, setNodes, 'running', `Waiting ${timeout} seconds`);
  
  //await new Promise(resolve => setTimeout(resolve, timeout * 1000));
  await sleep(timeout * 1000)
  const result = {
    waited: timeout,
    completed: true,
    data: data
  };
  
  updateNodeStatus(node, setNodes, 'success', `Waited ${timeout} seconds`);
  logExecution('Timeout', node, result);
  return result;
};

const webHookHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing webhook');
  const datta = data || getResponse();
  const webhookUrl = node.function?.url || 'https://workflow.developerscope.com/app/webhook/'+node.path;
  const method = node.function?.method || 'POST';
  
  try {
    //webhook call
    //await new Promise(resolve => setTimeout(resolve, 500));
    await sleep(500)
    const result = {
      webhook: true,
      url: webhookUrl,
      method: method,
      status: 200,
      response: 'Webhook processed successfully',
      data: datta
    };
    
    updateNodeStatus(node, setNodes, 'success', 'Webhook sent successfully');
    logExecution('Webhook', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Webhook failed: ${error.message}`);
    throw error;
  }
};

const codeHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Executing code');
  
  try {
    const code = node.function?.code || 'return data;';
    const language = node.function?.language || 'javascript';
    
    //code execution
    //await new Promise(resolve => setTimeout(resolve, 300));
    await sleep(300)
    // Basic JavaScript evaluation (in real implementation, use sandboxed environment)
    let result;
    if (language === 'javascript') {
      const func = new Function('data', code);
      result = func(data);
    } else {
      result = { executed: true, language, data };
    }
    
    updateNodeStatus(node, setNodes, 'success', 'Code executed successfully');
    logExecution('Code', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Code execution failed: ${error.message}`);
    throw error;
  }
};

const functionHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Calling function');
  const datta = data || getResponse();
  const functionName = node.function?.functionName || 'defaultFunction';
  const params = node.function?.params || {};
  
  try {
    //function call
    //await new Promise(resolve => setTimeout(resolve, 200));
    await sleep(200)
    const result = {
      function: functionName,
      params: params,
      executed: true,
      output: `Function ${functionName} executed with params: ${JSON.stringify(params)}`,
      data: datta
    };
    
    updateNodeStatus(node, setNodes, 'success', `Function ${functionName} executed`);
    logExecution('Function', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Function failed: ${error.message}`);
    throw error;
  }
};

// Control flow handlers
const loopHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing loop');
  
  const iterations = node.function?.Iterations || 1;
  const timeout = node.function?.Timeout || 0;
  
  const results = [];
   if (timeout > 0) {
      //await new Promise(resolve => setTimeout(resolve, timeout * 1000));
      await sleep(timeout * 1000)
    
    }
  
  if(loop >= iterations){
    loop = 0;
    setIsExecuting(false)
  }else{
  loop++
  
}

const result = {
    looped: true,
    iterations: iterations,
    loop:loop,
    results: results,
    data: data
  };
  
  updateNodeStatus(node, setNodes, 'success', `Loop completed ${iterations} iterations`);
  logExecution('Loop', node, result);
  return result;
};

const ifHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Evaluating condition');
  
  const condition = node.function?.condition || 'true';
  const statusType = node.function?.status_type;
  
  let conditionMet = false;
  
  if (statusType === "Failed") {
    conditionMet = false;
  } else if (statusType === "Success") {
    conditionMet = true;
  } else {
    // Evaluate custom condition
    try {
      conditionMet = eval(condition.replace(/data/g, JSON.stringify(data)));
    } catch (error) {
      conditionMet = false;
    }
  }
  
  const result = {
    condition: condition,
    conditionMet: conditionMet,
    branch: conditionMet ? 'true' : 'false',
    data: getResponse()
  };
  
  updateNodeStatus(node, setNodes, 'success', `Condition: ${conditionMet ? 'TRUE' : 'FALSE'}`);
  logExecution('If', node, result);
  return result;
};

const switchHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Evaluating switch');
  
  const switchValue = node.function?.switchValue || 'default';
  const cases = node.function?.cases || { default: 'default_case' };
  
  const selectedCase = cases[switchValue] || cases.default || 'no_match';
  
  const result = {
    switched: true,
    value: switchValue,
    selectedCase: selectedCase,
    availableCases: Object.keys(cases),
    data: getResponse()
  };
  
  updateNodeStatus(node, setNodes, 'success', `Switch case: ${selectedCase}`);
  logExecution('Switch', node, result);
  return result;
};

// Communication handlers
const EmailHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Sending email');
  
  const to = node.function?.to || 'recipient@example.com';
  const subject = node.function?.subject || 'Workflow Notification';
  const body = node.function?.body || 'This is an automated message from your workflow.';
  
  try {
    //email sending
    //await new Promise(resolve => setTimeout(resolve, 1000));
    await sleep(1000)
    const result = {
      emailSent: true,
      to: to,
      subject: subject,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `Email sent to ${to}`);
    logExecution('Email', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Email failed: ${error.message}`);
    throw error;
  }
};

const SlackHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Sending Slack message');
  
  const channel = node.function?.channel || '#general';
  const message = node.function?.message || 'Workflow update';
  const webhookUrl = node.function?.webhookUrl;
  
  try {
    //Slack API call
    //await new Promise(resolve => setTimeout(resolve, 500));
    await sleep(500)
    const result = {
      slackSent: true,
      channel: channel,
      message: message,
      timestamp: new Date().toISOString(),
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `Message sent to ${channel}`);
    logExecution('Slack', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Slack failed: ${error.message}`);
    throw error;
  }
};

const SMSHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Sending SMS');
  
  const to = node.function?.to || '+1234567890';
  const message = node.function?.message || 'Workflow notification';
  const from = node.function?.from || '+0987654321';
  
  try {
    //Twilio SMS sending
    //await new Promise(resolve => setTimeout(resolve, 800));
    await sleep(800)
    const result = {
      smsSent: true,
      to: to,
      from: from,
      message: message,
      sid: `SM${Date.now()}`,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `SMS sent to ${to}`);
    logExecution('SMS', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `SMS failed: ${error.message}`);
    throw error;
  }
};

// Database handlers
const DatabaseHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Executing MySQL query');
  
  const query = node.function?.query || 'SELECT * FROM users LIMIT 10';
  const database = node.function?.database || 'default_db';
  
  try {
    //MySQL query execution
    //await new Promise(resolve => setTimeout(resolve, 600));
    await sleep(600)
    const result = {
      query: query,
      database: database,
      rowsAffected: Math.floor(Math.random() * 100),
      executionTime: '0.045s',
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `MySQL query executed`);
    logExecution('MySQL', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `MySQL failed: ${error.message}`);
    throw error;
  }
};

const PostgreSQLHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Executing PostgreSQL query');
  
  const query = node.function?.query || 'SELECT * FROM users LIMIT 10';
  const database = node.function?.database || 'postgres';
  
  try {
    //PostgreSQL query execution
    //await new Promise(resolve => setTimeout(resolve, 550));
    await sleep(550)
    const result = {
      query: query,
      database: database,
      rowsAffected: Math.floor(Math.random() * 100),
      executionTime: '0.032s',
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `PostgreSQL query executed`);
    logExecution('PostgreSQL', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `PostgreSQL failed: ${error.message}`);
    throw error;
  }
};

const MongoDBHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Executing MongoDB operation');
  
  const collection = node.function?.collection || 'users';
  const operation = node.function?.operation || 'find';
  const query = node.function?.query || '{}';
  
  try {
    //MongoDB operation
    //await new Promise(resolve => setTimeout(resolve, 400));
    await sleep(400)
    const result = {
      collection: collection,
      operation: operation,
      query: query,
      documentsAffected: Math.floor(Math.random() * 50),
      executionTime: '0.023s',
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `MongoDB ${operation} executed`);
    logExecution('MongoDB', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `MongoDB failed: ${error.message}`);
    throw error;
  }
};

// Integration handlers
const HubSpotHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Syncing with HubSpot');
  
  const action = node.function?.action || 'create_contact';
  const objectType = node.function?.objectType || 'contact';
  
  try {
    //HubSpot API call
    //await new Promise(resolve => setTimeout(resolve, 700));
    await sleep(700)
    const result = {
      hubspotAction: action,
      objectType: objectType,
      objectId: `hs_${Date.now()}`,
      success: true,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `HubSpot ${action} completed`);
    logExecution('HubSpot', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `HubSpot failed: ${error.message}`);
    throw error;
  }
};

const MailChimpHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing MailChimp operation');
  
  const action = node.function?.action || 'add_subscriber';
  const listId = node.function?.listId || 'default_list';
  
  try {
    //MailChimp API call
    //await new Promise(resolve => setTimeout(resolve, 600));
    await sleep(600)
    const result = {
      mailchimpAction: action,
      listId: listId,
      subscriberId: `sub_${Date.now()}`,
      success: true,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `MailChimp ${action} completed`);
    logExecution('MailChimp', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `MailChimp failed: ${error.message}`);
    throw error;
  }
};

const AWSHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Invoking AWS Lambda');
  
  const functionName = node.function?.functionName || 'my-lambda-function';
  const payload = node.function?.payload || data;
  
  try {
    //AWS Lambda invocation
    //await new Promise(resolve => setTimeout(resolve, 800));
    await sleep(800)
    const result = {
      lambdaFunction: functionName,
      invocationId: `inv_${Date.now()}`,
      statusCode: 200,
      payload: payload,
      executionTime: '250ms',
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `Lambda ${functionName} executed`);
    logExecution('AWS Lambda', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `AWS Lambda failed: ${error.message}`);
    throw error;
  }
};

const GitHubHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing GitHub action');
  
  const action = node.function?.action || 'create_issue';
  const repository = node.function?.repository || 'user/repo';
  
  try {
    //GitHub API call
    //await new Promise(resolve => setTimeout(resolve, 500));
    await sleep(500)
    const result = {
      githubAction: action,
      repository: repository,
      actionId: `gh_${Date.now()}`,
      success: true,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `GitHub ${action} completed`);
    logExecution('GitHub', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `GitHub failed: ${error.message}`);
    throw error;
  }
};

//AI handlers
const OpenAIHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing OpenAI request');
  
  const model = node.function?.model || 'gpt-4';
  const prompt = node.function?.prompt || 'Analyze the following data';
  
  try {
    //OpenAI API call
    //await new Promise(resolve => setTimeout(resolve, 1200));
    await sleep(1200)
    const result = {
      model: model,
      prompt: prompt,
      response: `AI response based on: ${JSON.stringify(data)}`,
      tokens: Math.floor(Math.random() * 1000),
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `OpenAI ${model} completed`);
    logExecution('OpenAI', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `OpenAI failed: ${error.message}`);
    throw error;
  }
};

const StabilityAiHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Generating image with Stability AI');
  
  const prompt = node.function?.prompt || 'A beautiful landscape';
  const model = node.function?.model || 'stable-diffusion-xl';
  
  try {
    //Stability AI API call
    //await new Promise(resolve => setTimeout(resolve, 2000));
    await sleep(2000)
    const result = {
      model: model,
      prompt: prompt,
      imageUrl: `https://example.com/generated-image-${Date.now()}.png`,
      seed: Math.floor(Math.random() * 1000000),
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', 'Image generated successfully');
    logExecution('Stability AI', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Stability AI failed: ${error.message}`);
    throw error;
  }
};

//File storage handlers
const GoogleDriveHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing Google Drive operation');
  
  const action = node.function?.action || 'upload_file';
  const fileName = node.function?.fileName || 'workflow_data.json';
  
  try {
    //Google Drive API call
   // await new Promise(resolve => setTimeout(resolve, 900));
    await sleep(700)
    const result = {
      driveAction: action,
      fileName: fileName,
      fileId: `gd_${Date.now()}`,
      shareUrl: `https://drive.google.com/file/d/gd_${Date.now()}`,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `Google Drive ${action} completed`);
    logExecution('Google Drive', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Google Drive failed: ${error.message}`);
    throw error;
  }
};

const DropBoxHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing Dropbox operation');
  
  const action = node.function?.action || 'upload_file';
  const filePath = node.function?.filePath || '/workflow_data.json';
  
  try {
    //Dropbox API call
    //await new Promise(resolve => setTimeout(resolve, 700));
    await sleep(700)
    const result = {
      dropboxAction: action,
      filePath: filePath,
      fileId: `db_${Date.now()}`,
      shareUrl: `https://dropbox.com/s/db_${Date.now()}`,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `Dropbox ${action} completed`);
    logExecution('Dropbox', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Dropbox failed: ${error.message}`);
    throw error;
  }
};

// Additional handlers
const VoiceHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing speech to text');
  
  const audioUrl = node.function?.audioUrl || 'https://example.com/audio.wav';
  const language = node.function?.language || 'en-US';
  
  try {
    //speech-to-text processing
    //await new Promise(resolve => setTimeout(resolve, 1500));
    await sleep(1500)
    const result = {
      audioUrl: audioUrl,
      language: language,
      transcription: 'This is a sample transcription of the audio file.',
      confidence: 0.95,
      duration: '00:01:23',
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', 'Speech to text completed');
    logExecution('Voice', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Voice processing failed: ${error.message}`);
    throw error;
  }
};

const AnalyticsHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Processing analytics');
  
  const event = node.function?.event || 'workflow_executed';
  const properties = node.function?.properties || {};
  
  try {
    //analytics tracking
    //await new Promise(resolve => setTimeout(resolve, 300));
    await sleep(300)
    const result = {
      event: event,
      properties: properties,
      userId: `user_${Date.now()}`,
      timestamp: new Date().toISOString(),
      tracked: true,
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'success', `Analytics event "${event}" tracked`);
    logExecution('Analytics', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Analytics failed: ${error.message}`);
    throw error;
  }
};

const AuthHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Checking authentication');
  
  const authType = node.function?.authType || 'bearer';
  const token = node.function?.token || 'mock_token';
  
  try {
    //authentication check
    //await new Promise(resolve => setTimeout(resolve, 400));
    await sleep(400)
    const isValid = Math.random() > 0.1; // 90% success rate
    
    if (!isValid) {
      throw new Error('Authentication failed');
    }
    
    const result = {
      authType: authType,
      authenticated: true,
      userId: `user_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      data: data
    };
    
    updateNodeStatus(node, setNodes, 'error', 'Authentication successful');
    logExecution('Auth', node, result);
    return result;
  } catch (error) {
    updateNodeStatus(node, setNodes, 'error', `Authentication failed: ${error.message}`);
    throw error;
  }
};

//HTTP handler with comprehensive error handling and configuration
const httpHandler = async (node, setNodes, setIsExecuting, data) => {
  updateNodeStatus(node, setNodes, 'running', 'Preparing HTTP request');
  
  // Validate required URL
  if (!node?.function?.url) {
    const error = {
      success: false,
      status: 'Error: HTTP URL is required',
      message: `HTTP URL is required`
    }
    
    await errorHandler('error', setIsExecuting, setNodes, node, error.message);
    updateNodeStatus(node, setNodes, 'error', `HTTP URL is required`);
    return error;
  }
  
  try {
    const config = node.function;
    const method = config.method || 'GET';
    const url = config.url;
    const timeout = config.timeout || 30000; // 30 second default timeout
    
    updateNodeStatus(node, setNodes, 'running', `Making ${method} request to ${url}`);
    
    // Prepare request options
    const requestOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers || {}
      }
    };
    
    // Handle different content types for headers
    if (config.contentType) {
      requestOptions.headers['Content-Type'] = config.contentType; // Fixed: was config.headers
    }
    
    // Add authorization if provided
    if (config.authorization) {
      requestOptions.headers['Authorization'] = config.authorization;
    }
    
    // Add API key if provided
    if (config.apiKey) {
      if (config.apiKeyHeader) {
        requestOptions.headers[config.apiKeyHeader] = config.apiKey;
      } else {
        requestOptions.headers['X-API-Key'] = config.apiKey;
      }
    }
    
    // Handle request body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      if (config.body) {
        if (typeof config.body === 'string') {
          requestOptions.body = config.body;
        } else {
          requestOptions.body = JSON.stringify(config.body);
        }
      } else if (config.useInputData && data) {
        requestOptions.body = JSON.stringify(data);
      }
    }
    
    // Remove no-cors mode - this was causing issues
    // requestOptions.mode = 'no-cors';
    
    // Add CORS proxy if needed
    //let finalUrl = url;
   // if (config.useCorsProxy) {
      let finalUrl = `${url}`;
      // Alternative proxies:
      // finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      // finalUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    //}
    
    // Add query parameters if provided
    /*if (config.queryParams) {
      const searchParams = new URLSearchParams(config.queryParams);
      finalUrl += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }*/
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;
    
    // Store start time for response time calculation
    const startTime = Date.now();
    
    // Make the HTTP request
    const response = await fetch(finalUrl, requestOptions);
    clearTimeout(timeoutId);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    
    // Parse response based on content type
    let responseData;
    const responseContentType = response.headers || '';
    
    try {
      // Auto-detect based on response content type
      if (responseContentType.includes('application/json')) {
        responseData = await response.json();
      } else if (responseContentType.includes('text/')) {
        responseData = await response.text();
      } else {
        // Try JSON first, fallback to text
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      }
    } catch (parseError) {
      // If parsing fails, return raw text
      responseData = await response.text();
    }
    
    //console.log(responseData);
    
    const result = {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    setReponse(result)
    updateNodeStatus(node, setNodes, 'success', `HTTP ${method} completed (${response.status})`);
    await errorHandler('success', setIsExecuting, setNodes, node, result);
    logExecution('HTTP', node, result);
    return result;
    
  } catch (error) {
    let errorResult;
    
    if (error.name === 'AbortError') {
      errorResult = {
        success: false,
        error: 'Request timeout',
        message: `Request timed out after ${node.function.timeout || 30000}ms`,
        code: 'TIMEOUT',
        timestamp: new Date().toISOString()
      };
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorResult = {
        success: false,
        error: 'Network error',
        message: 'Failed to connect to the server. Check CORS settings and URL validity.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString()
      };
    } else if (error.message.includes('CORS')) {
      errorResult = {
        success: false,
        error: 'CORS error',
        message: 'Cross-Origin Request Blocked. Server needs to allow CORS.',
        code: 'CORS_ERROR',
        timestamp: new Date().toISOString()
      };
    } else {
      errorResult = {
        success: false,
        error: error.message,
        message: error.toString(),
        code: 'HTTP_ERROR',
        timestamp: new Date().toISOString()
      };
    }
    
    updateNodeStatus(node, setNodes, 'error', `HTTP request failed: ${error.message}`);
    await errorHandler('error', setIsExecuting, setNodes, node, errorResult);
    logExecution('HTTP', node, errorResult);
    setReponse(errorResult)
    return errorResult;
  }
};

// Error handler utility function
const errorHandler = async (status, setIsExecuting, setNodes, node, data) => {
  if (status === 'success') {
    updateNodeStatus(node, setNodes, 'success', 'Operation completed successfully');
  } else {
    updateNodeStatus(node, setNodes, 'error', `Operation failed: ${data?.message || 'Unknown error'}`);
  }
  
  // Log the result
  console.log(`[ErrorHandler] Node ${node.id} - Status: ${status}`, data);
  
  // You can add additional error handling logic here
  // Such as notifications, retries, etc.
  
  return data;
};

// Export all handlers
export {
  triggerHandler,
  scheduleHandler,
  timeOutHandler,
  webHookHandler,
  codeHandler,
  functionHandler,
  loopHandler,
  ifHandler,
  switchHandler,
  EmailHandler,
  SlackHandler,
  SMSHandler,
  DatabaseHandler,
  PostgreSQLHandler,
  MongoDBHandler,
  HubSpotHandler,
  MailChimpHandler,
  AWSHandler,
  GitHubHandler,
  OpenAIHandler,
  StabilityAiHandler,
  GoogleDriveHandler,
  DropBoxHandler,
  VoiceHandler,
  AnalyticsHandler,
  AuthHandler,
  httpHandler,
  errorHandler
};