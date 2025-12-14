import React, { useState, useRef, useCallback } from 'react';
import { 
  Play,Save, Search, MoreHorizontal, ChevronRight, RotateCcw,Trash,
  Pause,
  Clock,
  CheckCircle,
  Plus
} from 'lucide-react';
import {
  useParams
} from "react-router-dom";
import RenderFormField from './components/PanelField';
import { nodeTypes,getNodeConfig } from './util/nodeArrays';
import { sleep } from './util/utilResponse';
import {reactLocalStorage} from 'reactjs-localstorage';
import AuthApi from '../../components/AuthApi';
import NodeFunction  from './util/util';
import NodeComponent from './components/nodes';


const Main= () => {

  const {id} = useParams();
  const {createdBy} = React.useContext(AuthApi);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [prompt, setPrompt] = useState('');
  const [workflowName, setWorkflowName] = useState(id.replaceAll('-'," "));
  const [panelStatus, setPanelStatus] = useState('parameter');
  const [isExecuting, setIsExecuting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [generationSteps, setGenerationSteps] = useState([
    'Analyzing requirements...',
      'Designing architecture...',
      'Creating core services...',
      'Setting up data layer...',
      'Configuring security...',
      'Adding integrations...',
      'Optimizing connections...',
      'Finalizing workflow...'
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('nodes');
  const[isGenerating,setIsGenerating] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState('trigger');
  const [formData, setFormData] = useState({});
  const [isSavingg,setIsSaving] = useState(false);
  
  // Pan and zoom states
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  
  const canvasRef = useRef(null);
  const nodeIdCounter = useRef(0);
  let responses = null;
  let globalLoops = 0;
  let maxGlobalLoops = 3;
  let executionOrder = [];
  let shouldStop = false;
  const categories = [...new Set(nodeTypes.map(node => node.category))];

 

React.useEffect(()=>{

fetch(`https://workflow.developerscope.com/api/workflows/${id}/${createdBy}`)
.then(res=>res.json())
.then(response=>{
  if(response?.nodes && response?.connections){
    setWorkflowName(response?.name)
    setNodes(response.nodes);
    setConnections(response.connections);
  }
});


},[])


  const handleCanvasMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });

    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart]);


  

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedNode(null);
    }
  }, []);

  const handleCanvasTouchMove = useCallback((e) => {
    e.preventDefault();
     if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setMousePosition({ x, y });

    if (isPanning) {
      const deltaX = touch.clientX - panStart.x;
      const deltaY = touch.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [isPanning, panStart]);

 const handleCanvasTouchDown = useCallback((e) => {
    if (e.target === canvasRef.current && e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setSelectedNode(null);
    }
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleNodeDragStart = (nodeType) => {
    setDraggedNode(nodeType);
  };

  const handleCanvasDrop = async(e) => {
    e.preventDefault();
    if (!draggedNode) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasOffset.x) / scale - 75;
    const y = (e.clientY - rect.top - canvasOffset.y) / scale - 40;
    const randomString = Math.random().toString(36).substring(2, 10);
    if(draggedNode.id == "webhook"){
     

      const newNode = {
      id: `node-${nodes.length == 0?0:nodes.length}`,
      type: draggedNode.id,
      name: draggedNode.name,
      icon: draggedNode.icon,
      color: draggedNode.color,
      input:draggedNode.input,
      output:draggedNode.output,
      path:randomString,
      x,
      y,
      config: getNodeConfig(draggedNode.id,randomString),
      description:draggedNode.description,
      status: 'idle'
    };
  

    console.log(newNode)
    
    setNodes(prev => [...prev, newNode]);
    
    const reg = await fetch("https://developerscope.com/app/register-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: randomString }),
    }).then(res=>res.json())
    console.log(reg);

    }else{
    const newNode = {
      id: `node-${nodes.length == 0?0:nodes.length}`,
      type: draggedNode.id,
      name: draggedNode.name,
      icon: draggedNode.icon,
      color: draggedNode.color,
      input:draggedNode.input,
      output:draggedNode.output,
      path:null,
      x,
      y,
      config: getNodeConfig(draggedNode.id,randomString),
      description:draggedNode.description,
      status: 'idle'
    };
  

    console.log(newNode)
    
    setNodes(prev => [...prev, newNode]);
  }
    setDraggedNode(null);
  };


  const handleClickToCanvas = async(e,nodeType) => {
    e.preventDefault();
   

    
    const randomString = Math.random().toString(36).substring(2, 10);
    if(nodeType.id == "webhook"){
     

      const newNode = {
      id: `node-${nodes.length == 0?0:nodes.length}`,
      type: nodeType.id,
      name: nodeType.name,
      icon: nodeType.icon,
      color: nodeType.color,
      input:nodeType.input,
      output:nodeType.output,
      path:randomString,
      x:20,
      y:20,
      config: getNodeConfig(nodeType.id,randomString),
      description:nodeType.description,
      status: 'idle'
    };
  

    console.log(newNode)
    
    setNodes(prev => [...prev, newNode]);
    
    const reg = await fetch("https://developescope.com/app/register-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: randomString }),
    }).then(res=>res.json())
    console.log(reg);

    }else{
    const newNode = {
      id: `node-${nodes.length == 0?0:nodes.length}`,
      type: nodeType.id,
      name: nodeType.name,
      icon: nodeType.icon,
      color: nodeType.color,
      input:nodeType.input,
      output:nodeType.output,
      path:null,
      x:20,
      y:20,
      config: getNodeConfig(nodeType.id,randomString),
      description:nodeType.description,
      status: 'idle'
    };
  

    console.log(newNode)
    
    setNodes(prev => [...prev, newNode]);
  }
    setDraggedNode(null);
  };


  const handleNodeClick = (node) => {
    if (isConnecting) {
      if (connectionStart && connectionStart.id !== node.id) {

        const newConnection = {
          id: `conn-${Date.now()}`,
          from: connectionStart.id,
          to: node.id,
          fromX: connectionStart.x + 250,
          fromY: connectionStart.y + 50,
          toX: node.x,
          toY: node.y + 50
        };
        setConnections(prev => [...prev, newConnection]);
        setIsConnecting(false);
        setConnectionStart(null);
        
      }
    } else {
      setSelectedNode(node);
     
    }
  };

  const startConnection = (node) => {
    setIsConnecting(true);
    setConnectionStart(node);
  };

  const deleteNode = async(nodeId,node) => {
    executionOrder = await executionOrder.filter(n => n.id !== nodeId);
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    //executionOrder = await getExecutionOrder();
    setSelectedNode(null);
    const path = node.path;
    if(path != null){
     const data = await fetch('https://workflow.developerscope.com/app/webhook/'+path,{
        method:'DELETE'
      }).then(res =>res.json())
      console.log(data)
    }
    
    console.log(`Deleted ${nodeId} - ${executionOrder}`)
   
  };

  
  const updateNodePosition = (nodeId, x, y) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, x, y } : node
    ));
    
    setConnections(prev => prev.map(conn => {
      if (conn.from === nodeId) {
        return { ...conn, fromX: x + 250, fromY: y + 50};
      }
      if (conn.to === nodeId) {
        return { ...conn, toX: x, toY: y + 50 };
      }
      return conn;
    }));
  };

  
   // function to check if a node has any connections
  const hasConnections = (nodeId) => {
    return connections.some(conn => conn.from === nodeId || conn.to === nodeId);
  };

  // Get only nodes that are part of connections
  const getConnectedNodes = () => {
    const data = nodes.filter(node => hasConnections(node.id));
    console.log(data)
    return data
  };

  // Get execution order based on connections
  const getExecutionOrder = () => {
    const connectedNodes = getConnectedNodes();
    
    if (connectedNodes.length === 0) {
      return [];
    }

    // Find starting nodes (nodes with no incoming connections)
    const nodesWithIncoming = new Set(connections.map(conn => conn.to));
    const startingNodes = connectedNodes.filter(node => !nodesWithIncoming.has(node.id));
    
    const visited = new Set();
    const executionOrdder = [];
    
    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        executionOrdder.push(node);
        
 
      }
      
      // Find all nodes that this node connects to
      const outgoingConnections = connections.filter(conn => conn.from === nodeId);
      outgoingConnections.forEach(conn => {
        traverse(conn.to);
      });
    };
    
    // Start traversal from all starting nodes
    startingNodes.forEach(node => traverse(node.id));
    //executionOrder = executionOrdder;
    return executionOrdder;
  };





async function handleLoopNode(node, data, connections, executionOrder, setNodes) {
  console.log(`Node ${node.id} is a loop node`);
  
  // Find what this loop node is connected to
  const loopConnection = connections.find(conn => conn.from === node.id);
  
  if (!loopConnection) {
    console.log(`Loop node ${node.id} has no valid loop connection, continuing normally`);
    return { shouldLoop: false, targetIndex: -1 };
  }
  
  const loopTargetNodeId = loopConnection.to;
  const loopTargetIndex = executionOrder.findIndex(nodeId => nodeId.id == loopTargetNodeId);
  console.log('loop: ',loopTargetNodeId)
  
  if (loopTargetIndex === -1) {
    console.log(`Loop target node ${loopTargetNodeId} not found in execution order`);
    return { shouldLoop: false, targetIndex: -1 };
  }
  
  // Handle loop counter logic
  let shouldContinueLoop = false;
  // Initialize max loops if not set
    if (data.iterations) {
      maxGlobalLoops = data.iterations;
    }else{
     maxGlobalLoops = 3;
    }


  if (maxGlobalLoops) {
    
    
    // Check if we should continue looping
    if (globalLoops < maxGlobalLoops) {
      globalLoops++;
      shouldContinueLoop = true;

      console.log(`Loop ${node.id}: iteration ${globalLoops}/${maxGlobalLoops}`);
    } else {
      // Reset counters when loop is complete
      shouldContinueLoop = false;
      globalLoops = 0;
      //maxGlobalLoops = 0;
      
      console.log(`Loop ${node.id}: completed all iterations`);
    }
  } else {
    // If no iterations specified, loop indefinitely (be careful with this!)
    maxGlobalLoops = 3;
    shouldContinueLoop = true;
    console.log(`Loop ${node.id}: no iteration limit specified`);
  }
  
  // Set loop node status
  const status = shouldContinueLoop ? 'success' : 'completed';
  setNodes(prev =>
    prev.map(n => (n.id === node.id ? { ...n, status } : n))
  );
  
  if (shouldContinueLoop) {
    console.log(`Loop node ${node.id} jumping back to ${loopTargetNodeId} at index ${loopTargetIndex}`);
    return { shouldLoop: true, targetIndex: loopTargetIndex };
  } else {
    console.log(`Loop node ${node.id} has completed, continuing to next node`);
    return { shouldLoop: false, targetIndex: -1 };
  }
}


  
// Helper function to find connections to Success/Failed nodes
const findConditionalConnections = (node, connections,data,isNodeFailure) => {
  const nodeConnections = connections.filter(conn => conn.from === node.id);
  
const successConnection = nodeConnections.find(conn => {
  const targetNode = nodes.find(n => n.id === conn.to);
  return targetNode && (
    // Node has Success status
    (targetNode.function && targetNode.function.status_type === "Success") ||
    // Node is complete (not failed) and not an "if" type
    (!isNodeFailure && targetNode.type !== "if")
  );
});

const failedConnection = nodeConnections.find(conn => {
  const targetNode = nodes.find(n => n.id === conn.to);
  return targetNode && (
    // Node has Failed status
    (targetNode.function && targetNode.function.status_type === "Failed") ||
    // Node is failed and is an "if" type
    (isNodeFailure && targetNode.type === "if")
  );
});
  
  return { successConnection, failedConnection };
};

// Helper function to check if node should route to success (is "green")
const isNodeGreen = (node, data) => {
  // Multiple conditions to determine if node is "green"/successful
  return (
    data?.success === true ||
    data?.completed === true ||
    data?.status === 'success'
  );
};




// Helper function to get next node based on conditional routing
const getConditionalNextNode = (currentNode, data, connections, executionOrder,isNodeFailure) => {
  const { successConnection, failedConnection } = findConditionalConnections(currentNode, connections,data,isNodeFailure);
  
  if (!successConnection && !failedConnection) {
    return null; // No conditional routing needed
  }
  
  const isGreen = isNodeGreen(currentNode, data);
  const targetConnection = isGreen ? successConnection : failedConnection;
  console.log('success: ',JSON.stringify(successConnection)+' else error: '+JSON.stringify(failedConnection))
  if (targetConnection) {
    // Find the target node in execution order
    const targetNodeIndex = executionOrder.findIndex(node => node.id === targetConnection.to);
    return targetNodeIndex !== -1 ? targetNodeIndex : null;
  }
  
  return null;
};

const executeWorkflow = async () => {
  shouldStop = false;
  await setIsExecuting(true);
  
  setNodes(prev => prev.map(n => ({ ...n, status: 'idle' })));
  executionOrder = await getExecutionOrder();
  
  //await sleep(1000)
  //console.log('execution: ', executionOrder)
  
  if (executionOrder.length === 0) {
    console.log("No connected nodes to execute");
    setIsExecuting(false);
    return;
  }
 
  let i = 0;
 
  let executionContext = {};
 
  while (i < executionOrder.length && globalLoops < maxGlobalLoops) {
    
    
   

    
    
    const node = executionOrder[i];
   
    

    setNodes(prev =>
      prev.map(n => (n.id === node.id ? { ...n, status: 'running' } : n))
    );
   
    
   await sleep(1000)
    // Execute the node function
    const data = await NodeFunction(node, setNodes, setIsExecuting);
    console.log(`Node ${node.id} returned:`, data);
   
    // Store the result in execution context
    executionContext[node.id] = data;
    
   
    // Check if node failed
    const isNodeFailure = data?.success === false || data?.completed == false || data == null || data === "failed";
    
   
  if (isNodeFailure) {
     
    } else {
       setNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, status: 'success' } : n))
      );
    }

    if (shouldStop) {
        i = executionOrder.length; // or globalLoops = maxGlobalLoops;
        //i++;
        //globalLoops++;
        break; 
    }

    

    // Check for conditional routing first
const conditionalNextIndex = getConditionalNextNode(node, data, connections, executionOrder, isNodeFailure);

if (conditionalNextIndex !== null) {
  console.log(`Node ${node.id} has conditional routing, jumping to index ${conditionalNextIndex}`);
 
  // Set current node status based on condition
  const finalStatus = isNodeGreen(node, data) ? 'success' : 'error';
  setNodes(prev =>
    prev.map(n => (n.id === node.id ? { ...n, status: finalStatus } : n))
  );
 
  // Jump to the conditional target
  i = conditionalNextIndex;
  continue;
}



  const loopResult = await handleLoopNode(node, data, connections, executionOrder, setNodes);
  
  if (loopResult.shouldLoop) {
    // Jump back to the loop target
    i = loopResult.targetIndex;
    continue;
  }else{



  
   

    // Check if current node has outgoing connections
    const hasOutgoingConnections = connections.some(conn => conn.from === node.id);
    
    if (!hasOutgoingConnections) {
      console.log(`Node ${node.id} has no outgoing connections, stopping execution`);
      
      // Set final status for the current node
      const finalStatus = isNodeFailure ? 'error' : 'success';
      setNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, status: finalStatus } : n))
      );
      
      // Stop execution here
      break;
    }
   
    // Set final status based on result
    const finalStatus = isNodeFailure ? 'error' : 'success';
    setNodes(prev =>
      prev.map(n => (n.id === node.id ? { ...n, status: finalStatus } : n))
    );
   
    i++;
  }


  
}
 

  setIsExecuting(false);
  //shouldStop = true;
};

const stopExecution = () => {
  shouldStop = true;
  executionOrder = [];
  setIsExecuting(false);
  return shouldStop = true;
};

const handleStoppedExecution = () =>{
  return shouldStop
}

const executeWorkflowFromNode = async (selectedNodeId = null) => {
   shouldStop = false;
  setIsExecuting(true);
  
  setNodes(prev => prev.map(n => ({ ...n, status: 'idle' })));
  executionOrder = await getExecutionOrder();
 
 
  if (executionOrder.length === 0) {
    console.log("No connected nodes to execute");
    setIsExecuting(false);
    return;
  }

  // Find starting index based on selected node
  let startIndex = 0;
  if (selectedNodeId) {
    const nodeIndex = executionOrder.findIndex(node => node.id === selectedNodeId);
    if (nodeIndex !== -1) {
      startIndex = nodeIndex;
      console.log(`Starting execution from node ${selectedNodeId} at index ${startIndex}`);
    } else {
      console.log(`Selected node ${selectedNodeId} not found in execution order`);
      setIsExecuting(false);
      return;
    }
  }
 
  let i = startIndex; // Start from selected node
  let executionContext = {};
 
  while (i < executionOrder.length && globalLoops < maxGlobalLoops) {
    const node = executionOrder[i];
   
    setNodes(prev =>
      prev.map(n => (n.id === node.id ? { ...n, status: 'running' } : n))
    );

    const isStopped = await handleStoppedExecution();

    if (isStopped) {
   // i = executionOrder.length; // or globalLoops = maxGlobalLoops;
    break; // optional, but cleaner
   }
    
   
    await sleep(1000)
   
    // Execute the node function
    const data = await NodeFunction(node, setNodes, setIsExecuting);
    console.log(`Node ${node.id} returned:`, data);
   
    // Store the result in execution context
    executionContext[node.id] = data;
   
    // Check if node failed
    const isNodeFailure = data?.success === false || data?.completed == false || data?.triggered == false || data == null || data === "failed";
   
    
   
    // Check for conditional routing first
    const conditionalNextIndex = getConditionalNextNode(node, data, connections, executionOrder,isNodeFailure);
   
    if (conditionalNextIndex !== null) {
      console.log(`Node ${node.id} has conditional routing, jumping to index ${conditionalNextIndex}`);
     
      // Set current node status based on condition
      const finalStatus = isNodeGreen(node, data) ? 'success' : 'error';
      setNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, status: finalStatus } : n))
      );
     
      // Jump to the conditional target
      i = conditionalNextIndex;
      continue;
    }
   

//if (node.type === 'loop') {
  const loopResult = await handleLoopNode(node, data, connections, executionOrder, setNodes);
  
  if (loopResult.shouldLoop) {
    // Jump back to the loop target
    i = loopResult.targetIndex;
    continue;
  //}
  // If not looping, continue with normal execution flow
}else{

    
   
    // Check if current node has outgoing connections
    const hasOutgoingConnections = connections.some(conn => conn.from === node.id);
   
    if (!hasOutgoingConnections) {
      console.log(`Node ${node.id} has no outgoing connections, stopping execution`);
     
      // Set final status for the current node
      const finalStatus = isNodeFailure ? 'error' : 'success';
      setNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, status: finalStatus } : n))
      );
     
      // Stop execution here
      break;
    }
   
    // Set final status based on result
    const finalStatus = isNodeFailure ? 'error' : 'success';
    setNodes(prev =>
      prev.map(n => (n.id === node.id ? { ...n, status: finalStatus } : n))
    );
   
    i++;
  }
}
 
  setIsExecuting(false);
  //shouldStop = true
};



  const deleteConnection = async(connectionToDelete) => {
  // Removing the connection from the connections array
  setConnections(prev => prev.filter(conn => 
    !(conn.fromX === connectionToDelete.fromX && 
      conn.fromY === connectionToDelete.fromY && 
      conn.toX === connectionToDelete.toX && 
      conn.toY === connectionToDelete.toY)
  ));
  
  executionOrder = await executionOrder.filter(item => item.id !== connectionToDelete.to);
  //Updating node statuses back to 'idle' if they were part of execution chain
 setNodes(prev => prev.map(node => ({
    ...node,
   status: 'idle'
  })));
  
  
};






  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    //setScale(prev => Math.min(Math.max(prev * delta, 0.3), 3));
  }, []);

  

 const ConnectionLine = ({ 
    connection, 
    onDelete, 
    nodeWidth = 0, 
    nodeHeight = 0,
    nodePadding = 0,
    scale = 1,
    canvasOffset = { x: 0, y: 0 },
    allConnections = [], // Pass all connections to detect overlaps
    connectionIndex = 0   // Index of current connection in the array
}) => {
    
    const LINE_SPACING = 30; // Minimum spacing between parallel lines
    const CURVE_OFFSET = 15; // Offset for curved routing
    
    const calculatePath = () => {
        // Apply padding to connection points
        const { startX, startY, endX, endY } = calculatePaddedPoints(
            connection.fromX, 
            connection.fromY, 
            connection.toX, 
            connection.toY,
            nodePadding
        );
        
        // Calculate overlap offset for this connection
        const overlapOffset = calculateOverlapOffset(startX, startY, endX, endY);
        
        return createDynamicPathWithOffset(startX, startY, endX, endY, overlapOffset);
    };
    
    const calculateOverlapOffset = (startX, startY, endX, endY) => {
        // Find connections that might overlap with current one
        const overlappingConnections = findOverlappingConnections(startX, startY, endX, endY);
        
        if (overlappingConnections.length === 0) {
            return { offsetX: 0, offsetY: 0, layer: 0 };
        }
        
        // Calculate offset based on connection index and overlapping connections
        const layer = Math.floor(connectionIndex / 5);
        const side = connectionIndex % 2 === 0 ? 1 : -1; // Alternate sides
        
        return {
            offsetX: side * LINE_SPACING * (layer + 1),
            offsetY: side * LINE_SPACING * (layer + 1) * 0.5,
            layer: layer
        };
    };
    
    const findOverlappingConnections = (startX, startY, endX, endY) => {
        const OVERLAP_THRESHOLD = 30;
        const overlapping = [];
        
        allConnections.forEach((otherConnection, index) => {
            if (index === connectionIndex || !otherConnection) return;
            
            // Check if connections are roughly parallel and close
            const otherStartX = otherConnection.fromX;
            const otherStartY = otherConnection.fromY;
            const otherEndX = otherConnection.toX;
            const otherEndY = otherConnection.toY;
            
            // Calculate if paths might intersect or run parallel
            const thisAngle = Math.atan2(endY - startY, endX - startX);
            const otherAngle = Math.atan2(otherEndY - otherStartY, otherEndX - otherStartX);
            const angleDiff = Math.abs(thisAngle - otherAngle);
            
            // If angles are similar (parallel lines) or intersecting
            const isParallel = angleDiff < 0.2 || Math.abs(angleDiff - Math.PI) < 0.2;
            const isIntersecting = Math.abs(angleDiff - Math.PI/2) < 0.5;
            
            if (isParallel || isIntersecting) {
                // Check distance between paths
                const distance = calculatePathDistance(
                    startX, startY, endX, endY,
                    otherStartX, otherStartY, otherEndX, otherEndY
                );
                
                if (distance < OVERLAP_THRESHOLD) {
                    overlapping.push({ connection: otherConnection, index, distance });
                }
            }
        });
        
        return overlapping;
    };
    
    const calculatePathDistance = (x1, y1, x2, y2, x3, y3, x4, y4) => {
        // Calculate minimum distance between two line segments
        const midX1 = (x1 + x2) / 2;
        const midY1 = (y1 + y2) / 2;
        const midX2 = (x3 + x4) / 2;
        const midY2 = (y3 + y4) / 2;
        
        return Math.sqrt(Math.pow(midX2 - midX1, 2) + Math.pow(midY2 - midY1, 2));
    };
    
    const calculatePaddedPoints = (fromX, fromY, toX, toY, padding) => {
        //padding calculation with connection point optimization
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < padding * 2) {
            return { startX: fromX, startY: fromY, endX: toX, endY: toY };
        }
        
        // Calculate optimal connection points on node edges
        const { startX, startY } = calculateOptimalConnectionPoint(fromX, fromY, toX, toY, padding, true);
        const { endX, endY } = calculateOptimalConnectionPoint(toX, toY, fromX, fromY, padding, false);
        
        return { startX, startY, endX, endY };
    };
    
    const calculateOptimalConnectionPoint = (centerX, centerY, targetX, targetY, padding, isStart) => {
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const angle = Math.atan2(dy, dx);
        
        // Calculate connection point on the edge of the node
        const halfWidth = nodeWidth / 2;
        const halfHeight = nodeHeight / 2;
        
        let connectionX, connectionY;
        
        // Determine which edge to connect to based on angle
        const absAngle = Math.abs(angle);
        const isHorizontal = absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4;
        
        if (isHorizontal) {
            // Connect to left or right edge
            connectionX = centerX + (angle < Math.PI / 2 && angle > -Math.PI / 2 ? halfWidth + padding : -halfWidth - padding);
            connectionY = centerY + Math.tan(angle) * (connectionX - centerX);
            
            // Clamp to node height
            connectionY = Math.max(centerY - halfHeight, Math.min(centerY + halfHeight, connectionY));
        } else {
            // Connect to top or bottom edge
            connectionY = centerY + (angle > 0 ? halfHeight + padding : -halfHeight - padding);
            connectionX = centerX + (connectionY - centerY) / Math.tan(angle);
            
            // Clamp to node width
            connectionX = Math.max(centerX - halfWidth, Math.min(centerX + halfWidth, connectionX));
        }
        
        return { 
            startX: connectionX, 
            startY: connectionY, 
            endX: connectionX, 
            endY: connectionY 
        };
    };
    
    const createDynamicPathWithOffset = (startX, startY, endX, endY, offset) => {
        const dx = endX - startX;
        const dy = endY - startY;
        
        // Apply offset to avoid overlaps
        const offsetStartX = startX + offset.offsetX * 0.3;
        const offsetStartY = startY + offset.offsetY * 0.3;
        const offsetEndX = endX - offset.offsetX * 0.3;
        const offsetEndY = endY - offset.offsetY * 0.3;
        
        // If nodes are very close, use direct connection with offset
        if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
            return {
                path: createSVGPath([
                    { x: offsetStartX, y: offsetStartY },
                    { x: offsetEndX, y: offsetEndY }
                ]),
                points: [
                    { x: offsetStartX, y: offsetStartY },
                    { x: offsetEndX, y: offsetEndY }
                ]
            };
        }
        
        // Determine routing strategy
        const strategy = determineRoutingStrategy(dx, dy, offset.layer);
        
        switch (strategy) {
            case 'horizontal-first':
                return createHorizontalFirstPathWithOffset(offsetStartX, offsetStartY, offsetEndX, offsetEndY, dx, dy, offset);
            case 'vertical-first':
                return createVerticalFirstPathWithOffset(offsetStartX, offsetStartY, offsetEndX, offsetEndY, dx, dy, offset);
            case 'curved':
                return createCurvedPath(offsetStartX, offsetStartY, offsetEndX, offsetEndY, offset);
            case 'stepped':
                return createSteppedPathWithOffset(offsetStartX, offsetStartY, offsetEndX, offsetEndY, dx, dy, offset);
            default:
                return createHorizontalFirstPathWithOffset(offsetStartX, offsetStartY, offsetEndX, offsetEndY, dx, dy, offset);
        }
    };
    
    const determineRoutingStrategy = (dx, dy, layer) => {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Use curved paths for higher layers to create more separation
        if (layer > 1) {
            return 'curved';
        }
        
        // For overlapping connections, alternate between strategies
        if (layer > 0) {
            return connectionIndex % 2 === 0 ? 'horizontal-first' : 'vertical-first';
        }
        
        // Standard routing logic
        if (absDx > absDy * 2) return 'horizontal-first';
        if (absDy > absDx) return 'vertical-first';
        if (dx > 0 && absDy < 150) return 'horizontal-first';
        if (absDx < 150 && absDy > 50) return 'vertical-first';
        if (dx < -50) return 'stepped';
        
        return 'horizontal-first';
    };
    
    const createHorizontalFirstPathWithOffset = (startX, startY, endX, endY, dx, dy, offset) => {
        const points = [{ x: startX, y: startY }];
        
        // Calculate turn point with offset
        let horizontalDist = Math.max(80, Math.abs(dx) * 0.2) + Math.abs(offset.offsetX);
        if (dx < 0) horizontalDist = 100 + Math.abs(offset.offsetX);
        
        let turnX = startX + (dx >= 0 ? horizontalDist : -horizontalDist * 10);
        let turnY = startY + offset.offsetY * 0.5; // Slight vertical offset
        
        if (Math.abs(dy) < 30) {
            // Mostly horizontal with slight curve for separation
            const midY = (startY + endY) / 2 +  4;
            points.push({ x: turnX, y: turnY });
            points.push({ x: turnX, y: midY });
            points.push({ x: endX, y: midY });
        } else {
            // Standard L-shape with offset
            points.push({ x: turnX, y: turnY });
            points.push({ x: turnX, y: endY });
        }
        
        points.push({ x: endX, y: endY });
        
        return {
            path: createSVGPath(points),
            points: points
        };
    };
    
    const createVerticalFirstPathWithOffset = (startX, startY, endX, endY, dx, dy, offset) => {
        const points = [{ x: startX, y: startY }];
        
        // Calculate turn point with offset
        let verticalDist = Math.max(80, Math.abs(dy) * 0.6) + Math.abs(offset.offsetY);
        let turnY = startY + (dy >= 0 ? verticalDist : -verticalDist);
        let turnX = startX + offset.offsetX * 0.5; // Slight horizontal offset
        
        if (Math.abs(dx) < 30) {
            //vertical with slight curve for separation
            const midX = (startX + endX) / 2 + offset.offsetX;
            points.push({ x: turnX, y: turnY });
            points.push({ x: midX, y: turnY });
            points.push({ x: midX, y: endY });
        } else {
            // Standard inverted L-shape with offset
            points.push({ x: turnX, y: turnY });
            points.push({ x: endX, y: turnY });
        }
        
        points.push({ x: endX, y: endY });
        
        return {
            path: createSVGPath(points),
            points: points
        };
    };
    
    const createCurvedPath = (startX, startY, endX, endY, offset) => {
        // Create a curved path for better visual separation
        const midX = (startX + endX) / 2 + offset.offsetX;
        const midY = (startY + endY) / 2 + offset.offsetY;
        
        // Add control points for smoother curves
        const controlX1 = startX + (midX - startX) * 0.5;
        const controlY1 = startY + offset.offsetY * 0.8;
        const controlX2 = endX - (endX - midX) * 0.5;
        const controlY2 = endY - offset.offsetY * 0.8;
        
        const points = [
            { x: startX, y: startY },
            { x: controlX1, y: controlY1 },
            { x: midX, y: midY },
            { x: controlX2, y: controlY2 },
            { x: endX, y: endY }
        ];
        
        return {
            path: createSVGPathWithBezier(points),
            points: points
        };
    };
    
    const createSteppedPathWithOffset = (startX, startY, endX, endY, dx, dy, offset) => {
        const points = [{ x: startX, y: startY }];
        
        // Enhanced stepped path with offset for avoiding overlaps
        const stepOut = 120 + Math.abs(offset.offsetX);
        const firstStepX = startX + stepOut;
        const firstStepY = startY + offset.offsetY * 0.3;
        
        points.push({ x: firstStepX, y: firstStepY });
        
        // Add intermediate points for better routing around obstacles
        if (Math.abs(dy) > 40) {
            const intermediateY = endY + offset.offsetY * 0.5;
            points.push({ x: firstStepX, y: intermediateY });
        }
        
        // Final approach to target
        const finalStepX = endX - stepOut;
        points.push({ x: finalStepX, y: endY });
        points.push({ x: endX, y: endY });
        
        return {
            path: createSVGPath(points),
            points: points
        };
    };
    
    const createSVGPath = (points) => {
        if (!points || points.length < 2) return '';
        
        let pathString = `M ${points[0].x * scale + canvasOffset.x} ${points[0].y * scale + canvasOffset.y}`;
        
        for (let i = 1; i < points.length; i++) {
            const x = points[i].x * scale + canvasOffset.x;
            const y = points[i].y * scale + canvasOffset.y;
            pathString += ` L ${x} ${y}`;
        }
        
        return pathString;
    };
    
    const createSVGPathWithBezier = (points) => {
        if (!points || points.length < 2) return '';
        
        let pathString = `M ${points[0].x * scale + canvasOffset.x} ${points[0].y * scale + canvasOffset.y}`;
        
        // Create smooth curve using quadratic bezier curves
        for (let i = 1; i < points.length - 1; i += 2) {
            const cpX = points[i].x * scale + canvasOffset.x;
            const cpY = points[i].y * scale + canvasOffset.y;
            const endX = points[i + 1].x * scale + canvasOffset.x;
            const endY = points[i + 1].y * scale + canvasOffset.y;
            
            pathString += ` Q ${cpX} ${cpY} ${endX} ${endY}`;
        }
        
        // Add final point if odd number of points
        if (points.length % 2 === 0) {
            const lastPoint = points[points.length - 1];
            const x = lastPoint.x * scale + canvasOffset.x;
            const y = lastPoint.y * scale + canvasOffset.y;
            pathString += ` L ${x} ${y}`;
        }
        
        return pathString;
    };
    
    // Calculate the midpoint along the actual path
    const calculatePathMidpoint = (points) => {
        if (!points || points.length < 2) {
            return { x: 0, y: 0 };
        }
        
        // Calculate total path length
        let totalLength = 0;
        const segments = [];
        
        for (let i = 1; i < points.length; i++) {
            const segmentLength = Math.sqrt(
                Math.pow(points[i].x - points[i-1].x, 2) + 
                Math.pow(points[i].y - points[i-1].y, 2)
            );
            segments.push({
                start: points[i-1],
                end: points[i],
                length: segmentLength
            });
            totalLength += segmentLength;
        }
        
        // Find the segment that contains the midpoint
        const halfLength = totalLength / 2;
        let accumulatedLength = 0;
        
        for (const segment of segments) {
            if (accumulatedLength + segment.length >= halfLength) {
                const segmentProgress = (halfLength - accumulatedLength) / segment.length;
                const midX = segment.start.x + (segment.end.x - segment.start.x) * segmentProgress;
                const midY = segment.start.y + (segment.end.y - segment.start.y) * segmentProgress;
                
                return {
                    x: midX * scale + canvasOffset.x,
                    y: midY * scale + canvasOffset.y
                };
            }
            accumulatedLength += segment.length;
        }
        
        // Fallback
        const midIndex = Math.floor(points.length / 2);
        return {
            x: points[midIndex].x * scale + canvasOffset.x,
            y: points[midIndex].y * scale + canvasOffset.y
        };
    };
    
    // Validate connection object
    if (!connection || 
        typeof connection.fromX !== 'number' || 
        typeof connection.fromY !== 'number' || 
        typeof connection.toX !== 'number' || 
        typeof connection.toY !== 'number') {
        console.warn('Invalid connection object:', connection);
        return null;
    }
    
    const pathResult = calculatePath();
    if (!pathResult || !pathResult.path) {
        console.warn('Failed to calculate path for connection:', connection);
        return null;
    }
    
    const pathMidpoint = calculatePathMidpoint(pathResult.points);
    
    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(connection);
        }
    };
    
    const connectionId = connection.id || `${connection.fromX}-${connection.fromY}-${connection.toX}-${connection.toY}-${connectionIndex}`;
    
    return (
        <g className="connection-line-group" style={{zIndex:1,position:'absolute'}}>
            
            
            {/* Main connection line with arrow */}
            <path
                d={pathResult.path}
                stroke="#9CA3AF"
                strokeWidth={2 * scale}
                fill="none"
                markerEnd={`url(#arrowhead-${connectionId})`}
                className="connection-path"
               style={{zIndex:1,position:'absolute',pointerEvents: 'none'}}
            />
            
            {/* Invisible thicker line for easier hovering */}
            <path
                d={pathResult.path}
                stroke="transparent"
                strokeWidth={12 * scale}
                fill="none"
                className="connection-hover-area"
                style={{ cursor: "pointer" }}
            />
            
            {/* Delete button */}
            <g className="delete-button pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                <circle
                    cx={pathMidpoint.x}
                    cy={pathMidpoint.y}
                    r={10 * scale}
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth={2 * scale}
                    onClick={handleDeleteClick}
                    className="cursor-pointer hover:fill-red-600 transition-colors shadow-lg"
                    style={{ pointerEvents: 'auto' }}
                />
                <text
                    x={pathMidpoint.x}
                    y={pathMidpoint.y + 1}
                    textAnchor="middle"
                    fontSize={12 * scale}
                    fill="white"
                    className="cursor-pointer select-none font-bold"
                    style={{ pointerEvents: 'auto' }}
                    onClick={handleDeleteClick}
                >
                    ×
                </text>
            </g>
        </g>
    );
};

  const handleNodeDrag = (id, pos) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => (node.id === id ? { ...node, ...pos } : node))
    );
  };


  const handleSaveToDatabase = ()=>{

     const form = new FormData();
    form.append('name',workflowName.replaceAll(' ','-'));
    form.append('nodes',JSON.stringify(nodes));
    form.append('connections',JSON.stringify(connections));
    form.append('createdBy',createdBy);

   
    fetch('https://workflow.developerscope.com/api/workflows/',{
      method:'POST',
       headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: workflowName.replaceAll(' ', '-'),
      nodes,
      connections,
      createdBy
    })
    }).then(res=>res.json())
    .then(response=>{
      if(response?.success){

        

      }else{
      
      console.log(response.error)
      
      }
    });
  }


 // Handling save button click
  const handleSave = async(e) => {
    e.preventDefault();
    if (!selectedNode) return;
    
    setIsSaving(true)
    

    // Updating the nodes array with the new configuration
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === selectedNode.id 
          ? { ...node, config: selectedNode.config, function:formData[selectedNode.id] }
          : node
      ));
    console.log(nodes)

    await sleep(400)
    
 setIsSaving(false)
    

    // Optional: Show success message or close panel
    //alert('Configuration saved successfully!');
  };


    const handleFieldChange = (fieldKey, value) => {
    if (!selectedNode) return;
    
    setFormData(prev => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        [fieldKey]: value
      }
    }));
  };


  const handleOnChange = (fieldKey, value) => {
    if (!selectedNode) return;
    
   setNodes((prevNodes) =>
   prevNodes.map((node) => 
    node.id === selectedNode.id 
      ? { ...node, [fieldKey]: value } 
      : node 
  )); 
  };


    const handleNode = (node) => {
    setSelectedNode(node);
    
    // Initialize form data with existing values or defaults
    const initialFormData = {};
    node.config.forEach(field => {
      initialFormData[field.name] = formData[node.id]?.[field.name] || field.value || '';
    });
    
    setFormData(prev => ({
      ...prev,
      [node.id]: node.config
    }));
  };

  return (
    <div className="flex h-screen w-full bg-black text-white">
      

      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-[#131313] h-screen overflow-y-auto shadow-xl border-r border-gray-700 relative`}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute right-2 top-4 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
        
        {!sidebarCollapsed && (
          <>
            <div className={`p-4 ${activeTab == "AI"?'pb-0':''} border-b border-gray-700`}>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setActiveTab('nodes')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'nodes' ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Nodes
                </button>
                <button
                  onClick={() => setActiveTab('AI')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'AI' ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  Create with AI
                </button>
              </div>

              {activeTab === 'nodes'?<div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  className="w-full pl-10 pr-4 py-2 bg-[#242121] border-1 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>:null}
            </div>


              {activeTab == "AI"?<div className={`flex flex-col items-end gap-2 w-full p-3`}>
              <div className="mb-4 w-full">
               
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your automation and AI will build it. Example: When a new file is uploaded to Google Drive, convert the file to PDF format, then send a notification message to a Slack channel."
                  className="w-full h-40 px-4 py-3 border-1 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm leading-relaxed"
                />
              </div>
                <button onClick={()=>{
                  if(!prompt.trim())return;
                  setIsGenerating(true)

                   const stepInterval = setInterval(() => {
                    setCurrentStep(prev => {
                     if (prev >= generationSteps.length - 1) {
                    clearInterval(stepInterval);
                     return prev;
                      }
                      return prev + 1;
                    });
                       }, 300);
                       
                   fetch('http://localhost:5000/workflow/generateFlow',{
                   method:'POST',
                   headers:{
                   'Content-Type': 'application/json'
                    },
                   body: JSON.stringify({"prompt":prompt}),
     
                  }).then(res=>res.json())
                  .then(response=>{
                  setIsGenerating(false)  
                  clearInterval(stepInterval);  
                    if(response.error) return console.log(response.error);
                  
                    
                   
                  setPrompt("");
                  setNodes(response.nodes)
                  setConnections(response.connections)

                  
                  });

                }} className={`p-2 bg-gray-700 cursor-pointer hover:bg-gray-600 rounded-md w-full flex items-center justify-center text-center`}>{isGenerating?<span className={`flex items-center justify-center text-center gap-2`}><Clock className="h-4 w-4 animate-spin text-indigo-500" /> Generating...</span>:'Generate Nodes'}</button>

              </div>:null}
            
            
            {activeTab === 'nodes'?<div className="p-4 space-y-4">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {nodeTypes.filter(node => node.category === category).map((nodeType) => {
                      const Icon = nodeType.icon;
                      return (
                        <div key={nodeType.id} className={`w-full flex items-center gap-2 group draggable`}>
                        <div
                          
                          className="flex w-full items-center space-x-3 p-3  rounded-lg  cursor-grab hover:bg-[#2a2a2a] transition-all duration-200 hover:border-yellow-500"
                          draggable
                          onDragStart={() => handleNodeDragStart(nodeType)}
                          onTouchStart={(e) => handleTouchStart(e, nodeType)}
                          
                          
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${nodeType.color} shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon className="w-4 h-4 text-black" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{nodeType.name}</div>
                            <div className="text-xs text-gray-400">{nodeType.description}</div>
                          </div>
                        
                        {<button className={'text-gray-50 hover:text-yellow-500'} onClick={(e)=>{
                          e.stopPropagation()
                          handleClickToCanvas(e,nodeType)

                        }}><Plus /></button>}
                        
                        </div>
                      

                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>:null}
          </>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 draggable relative overflow-hidden">
        {/* Header */}
      <div className="sticky top-0 left-0 right-0 h-16 bg-black flex items-center justify-between px-6 z-20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            
            <span className="text-xl font-bold">Dev</span>
          </div>
          <div className="h-6 w-px bg-gray-600"></div>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-lg font-medium focus:outline-none focus:bg-gray-700 px-2 py-1 rounded"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            Zoom: {Math.round(scale * 100)}%
          </div>
          <button
            onClick={executeWorkflow}
            disabled={isExecuting || nodes.length === 0}
            className="flex items-center cursor-pointer space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-all duration-200"
          >
            {isExecuting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isExecuting ? 'Executing...' : 'Execute'}</span>
          </button>
          {isExecuting?<button
            tabIndex={0}
            onClick={()=>{
            executionOrder = [];
            shouldStop = true;
            setIsExecuting(false)
            stopExecution()
            
            
            }}
            className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 cursor-pointer  px-4 py-2 rounded-lg transition-all duration-200"
          >
            {<Pause className="w-4 h-4" />}
            
          </button>:null}
          
          <button onClick={handleSaveToDatabase} className="p-2 cursor-pointer hover:bg-gray-700 rounded-lg transition-colors">
            <Save className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
        <div className="absolute top-20 left-4 z-10">
          <div className="flex space-x-2">
            <button
              className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                isConnecting 
                  ? 'bg-yellow-600 text-black shadow-lg' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
              onClick={() => {
                setIsConnecting(!isConnecting);
                setConnectionStart(null);
              }}
            >
              {isConnecting ? 'Cancel Connection' : 'Connect Nodes'}
            </button>
            <button
              className="px-3 py-2 text-sm rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              onClick={() => {
                setNodes([]);
                setConnections([]);
                setSelectedNode(null);
              }}
            >
              Clear Canvas
            </button>
            <button
              className="px-3 py-2 text-sm rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              onClick={() => {
                setCanvasOffset({ x: 0, y: 0 });
                setScale(1);
              }}
            >
              Reset View
            </button>
          </div>
        </div>

            
            {isGenerating && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-[#131313] p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-50 mb-2">Building Your Automation</h3>
                  <p className="text-gray-100 mb-6">AI is analyzing your requirements...</p>
                  
                  <div className="space-y-2">
                    {generationSteps.map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-2 rounded-lg transition-all ${
                          index <= currentStep ? 'bg-green-50 text-green-700' : 'bg-gray-900 text-gray-100'
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : index === currentStep ? (
                          <Clock className="h-4 w-4 animate-spin text-indigo-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                        )}
                        <span className="text-sm font-medium">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}


        <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-50 rounded-lg p-2 text-xs text-gray-300">
          <div>Mouse: Pan canvas</div>
          <div>Hold + Drag: Move nodes</div>
          <div>Scroll: Zoom in/out</div>
        </div>

        <div
          ref={canvasRef}
          className="w-full h-full draggable relative bg-black cursor-grab"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(17, 17, 17) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(17, 17, 17) 1px, transparent 1px)
            `,
            backgroundSize: `${25}px ${25}px`,
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
            cursor: isPanning ? 'grabbing' : 'grab',
            width:'100%'
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onTouchMove={handleCanvasTouchMove}
          onTouchStart={handleCanvasTouchDown}
          onTouchEnd={handleCanvasMouseUp}
          

        >
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0,position:'absolute',width:window.innerWidth + 50 * scale ,height:window.innerHeight + 50 * scale}}>
            {connections.map((connection,index) => (
              <ConnectionLine key={connection.id} connectionIndex={index} onDelete={deleteConnection} allConnections={connections}  canvasOffset={canvasOffset} connection={connection} />
            ))}
            
            {isConnecting && connectionStart && (
              <path
                d={`M ${(connectionStart.x + 250) * scale + canvasOffset.x} ${(connectionStart.y + 50) * scale + canvasOffset.y} 
                    C ${(connectionStart.x + 150) * scale + canvasOffset.x} ${(connectionStart.y + 50) * scale + canvasOffset.y} 
                      ${mousePosition.x - 50} ${mousePosition.y} 
                      ${mousePosition.x} ${mousePosition.y}`}
                stroke="#f0b100"
                strokeWidth={3 * scale}
                fill="none"
                className="pointer-events-none"
              />
            )}
          </svg>

          <div
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: 'top left'
            }}
          >
            {nodes.length > 0 &&  nodes.map((node) => (
              <NodeComponent
                node={node}
                canvasRef={canvasRef}
                canvasOffset={canvasOffset}
                scale={scale}
                updateNodePosition={updateNodePosition}
                selectedNode={selectedNode}
                handleNodeDrag={handleNodeDrag}
                onNodeClick={handleNodeClick}
                handleNode={handleNode}
                onStartConnection={startConnection}
                onDelete={deleteNode}
                executeWorkflowFromNode={executeWorkflowFromNode}
              />
            ))}
          </div>
        </div>
      </div>

{/* Properties Panel */}
      {selectedNode && (
        <div className="w-96 bg-[#131313] shadow-xl border-l border-gray-700 overflow-y-auto h-full">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Node Settings</h3>
          <div className="flex w-full gap-2">
            <button onClick={()=>{setPanelStatus('parameter')}} className={`p-2 px-4 rounded-md w-full cursor-pointer ${panelStatus == "parameter"?'bg-yellow-600 text-black':'hover:bg-yellow-500 bg-transparent text-gray-400 hover:text-black'}`}>Parameters</button>
            <button onClick={()=>{setPanelStatus('settings')}} className={`p-2 px-4 rounded-md w-full cursor-pointer ${panelStatus == "settings"?'bg-yellow-600 text-black':'hover:bg-yellow-500 bg-transparent text-gray-400 hover:text-black'}`}>Settings</button>
          
          </div>
          
          </div>
          

          {panelStatus == "parameter"?<div className="p-2">
          
          {selectedNode!= null && selectedNode?.config.map((field)=>(<RenderFormField selectedNode={selectedNode != null?selectedNode:null} handleFieldChange={handleFieldChange} field={field} formData={formData} />))}
          


          {formData[selectedNode.id] && Object.keys(formData[selectedNode.id]).length > 0 && (
                  <div className="border-t border-gray-800 p-2 pt-6">
                    <h3 className="text-lg font-medium text-gray-100 mb-4">Current Configuration</h3>
                    <div className="bg-[#242121] rounded-md p-4">
                      <pre className="text-sm text-gray-200 overflow-x-auto">
                        {JSON.stringify(formData[selectedNode.id], null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              
                
        </div>:null}

         {panelStatus == "settings"?<div className="p-2">

          <div className="py-2 px-2 flex flex-col items-start gap-2">
            <label className="block text-sm font-medium text-gray-100">Node name</label>
            <input
              type="text"
              value={selectedNode.name}
              onChange={(e) => {
                handleOnChange('name', e.target.value)
                selectedNode.name = e.target.value
                //console.log('selected',selectedNode.name)
              }}
              
              className="w-full px-3 py-2 border-1 border-gray-800 bg-[#242121] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
         
         <div  className="py-2 px-2 flex flex-col items-start gap-2">
            <label className="block text-sm font-medium text-gray-100">Notes</label>
            <textarea
              value={selectedNode.note}
              onChange={(e) =>{
                handleOnChange('note', e.target.value)
                selectedNode.note = e.target.value
                //console.log('selected',selectedNode.description)
              }}
              placeholder={'write notes'}
              rows={4}
              className="w-full px-3 py-2 border-1 border-gray-800 bg-[#242121] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

         </div>:null}

        <div tabIndex={0} className={`flex gap-2 w-full items-center p-3`}>
                <button tabIndex={0} onClick={handleSave} className={`w-full p-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-md cursor-pointer disabled:bg-yellow-700`}>{isSavingg?'Saving...':'Save'}</button>
              </div>
        </div>
      )}

    </div>
  );
};






export default Main;