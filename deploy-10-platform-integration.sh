#!/bin/bash

echo "🚀 Deploying 10-Platform MCP Integration for AJOB4AGENT"
echo "======================================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) found"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi
echo "✅ Python $(python3 --version) found"

# Setup environment
echo ""
echo "🔧 Setting up environment..."

# Update .env with new platform configurations
echo "
# 10-Platform MCP Integration
MCP_JOBSPY_PORT=9423
MCP_JOBSPY_HOST=localhost
MCP_YCOMBINATOR_PORT=9424
MCP_TECH_TALENT_PORT=9425

# API Keys (configure these)
GREENHOUSE_API_KEY=your_greenhouse_key_here
GOOGLE_TALENT_API_KEY=your_google_talent_key_here
GOOGLE_PROJECT_ID=ajob4agent-project
CORESIGNAL_API_KEY=your_coresignal_key_here
WELLFOUND_ACCESS_TOKEN=your_wellfound_token_here

# Platform Features
ENABLE_JOBSPY_MCP=true
ENABLE_ENTERPRISE_APIS=true
ENABLE_CUSTOM_MCP=true
ENABLE_ERROR_RECOVERY=true
ENABLE_PERFORMANCE_MONITORING=true
" >> .env

echo "✅ Environment variables updated"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

# Agent Orchestrator dependencies
cd services/agent-orchestrator
echo "Installing agent orchestrator dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install agent orchestrator dependencies"
    exit 1
fi
echo "✅ Agent orchestrator dependencies installed"

# Install MCP client dependencies
npm install @modelcontextprotocol/client @modelcontextprotocol/types
echo "✅ MCP client dependencies installed"

# Build TypeScript
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build agent orchestrator"
    exit 1
fi
echo "✅ Agent orchestrator built successfully"

# MCP Servers setup
cd ../../mcp-servers

# Setup JobSpy MCP Server (external)
echo ""
echo "🔄 Setting up JobSpy MCP Server..."
if [ ! -d "jobspy-mcp-server" ]; then
    git clone https://github.com/borgius/jobspy-mcp-server.git
    cd jobspy-mcp-server
    npm install
    pip3 install jobspy
else
    cd jobspy-mcp-server
    git pull
    npm install
fi
echo "✅ JobSpy MCP Server ready"

# Build Y Combinator MCP Server
cd ../ycombinator-server
echo "Building Y Combinator MCP Server..."
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build Y Combinator MCP Server"
    exit 1
fi
echo "✅ Y Combinator MCP Server built"

# Build Tech Talent MCP Server
cd ../tech-talent-server
echo "Building Tech Talent MCP Server..."
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build Tech Talent MCP Server"
    exit 1
fi
echo "✅ Tech Talent MCP Server built"

# Create startup scripts
cd ../../
echo ""
echo "📝 Creating startup scripts..."

# Create MCP servers startup script
cat > start-mcp-servers.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting all MCP servers..."

# Start JobSpy MCP Server
cd mcp-servers/jobspy-mcp-server
node index.js &
JOBSPY_PID=$!
echo "✅ JobSpy MCP Server started (PID: $JOBSPY_PID)"

# Start Y Combinator MCP Server
cd ../ycombinator-server
node dist/index.js &
YC_PID=$!
echo "✅ Y Combinator MCP Server started (PID: $YC_PID)"

# Start Tech Talent MCP Server
cd ../tech-talent-server
node dist/index.js &
TECH_PID=$!
echo "✅ Tech Talent MCP Server started (PID: $TECH_PID)"

cd ../../

echo ""
echo "🎯 All MCP servers running!"
echo "JobSpy: PID $JOBSPY_PID"
echo "Y Combinator: PID $YC_PID" 
echo "Tech Talent: PID $TECH_PID"

# Save PIDs for cleanup
echo "$JOBSPY_PID" > .mcp_pids
echo "$YC_PID" >> .mcp_pids
echo "$TECH_PID" >> .mcp_pids

echo ""
echo "Use 'bash stop-mcp-servers.sh' to stop all servers"

# Keep script running
wait
EOF

# Create stop script
cat > stop-mcp-servers.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping all MCP servers..."

if [ -f .mcp_pids ]; then
    while read pid; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            echo "✅ Stopped process $pid"
        fi
    done < .mcp_pids
    rm .mcp_pids
    echo "✅ All MCP servers stopped"
else
    echo "No MCP server PIDs found"
fi
EOF

# Create main startup script
cat > start-ajob4agent.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting AJOB4AGENT with 10-Platform Integration"
echo "=================================================="

# Start MCP servers in background
bash start-mcp-servers.sh &
MCP_SCRIPT_PID=$!

# Wait for MCP servers to initialize
echo "⏳ Waiting for MCP servers to initialize..."
sleep 5

# Start Agent Orchestrator
echo "🎯 Starting Agent Orchestrator..."
cd services/agent-orchestrator
npm start &
ORCHESTRATOR_PID=$!

echo ""
echo "✅ AJOB4AGENT is running!"
echo "📊 Agent Orchestrator: http://localhost:8080"
echo "🔍 Unified Search API: http://localhost:8080/api/unified/search-all"
echo "📈 Platform Stats: http://localhost:8080/api/unified/stats"
echo "📋 Available Platforms: http://localhost:8080/api/unified/platforms"

echo ""
echo "🎯 10-Platform Coverage:"
echo "   Tier 1 - JobSpy MCP: Indeed, LinkedIn, Glassdoor, ZipRecruiter"
echo "   Tier 2 - Enterprise APIs: Greenhouse, Google Talent, Coresignal"  
echo "   Tier 3 - Custom MCP: Y Combinator, Wellfound, Tech Talent Unified"

# Save main PID
echo "$ORCHESTRATOR_PID" > .orchestrator_pid

echo ""
echo "Use 'bash stop-ajob4agent.sh' to stop all services"

# Keep running
wait
EOF

# Create stop script
cat > stop-ajob4agent.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping AJOB4AGENT..."

# Stop orchestrator
if [ -f .orchestrator_pid ]; then
    ORCHESTRATOR_PID=$(cat .orchestrator_pid)
    if kill -0 "$ORCHESTRATOR_PID" 2>/dev/null; then
        kill "$ORCHESTRATOR_PID"
        echo "✅ Stopped Agent Orchestrator"
    fi
    rm .orchestrator_pid
fi

# Stop MCP servers
bash stop-mcp-servers.sh

echo "✅ AJOB4AGENT stopped"
EOF

# Make scripts executable
chmod +x start-mcp-servers.sh
chmod +x stop-mcp-servers.sh
chmod +x start-ajob4agent.sh
chmod +x stop-ajob4agent.sh

echo "✅ Startup scripts created"

# Final validation
echo ""
echo "🧪 Running deployment validation..."
cd services/agent-orchestrator

# Check if TypeScript compiled successfully
if [ ! -f "dist/index.js" ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Check if all adapter files exist
REQUIRED_FILES=(
    "dist/adapters/platform-manager.js"
    "dist/adapters/jobspy-mcp-adapter.js"
    "dist/adapters/greenhouse-adapter.js"
    "dist/adapters/google-talent-adapter.js"
    "dist/adapters/coresignal-adapter.js"
    "dist/adapters/ycombinator-adapter.js"
    "dist/adapters/wellfound-enhanced-adapter.js"
    "dist/adapters/tech-talent-adapter.js"
    "dist/api/unified-job-search.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

cd ../../

echo "✅ All required files present"

echo ""
echo "🎉 10-Platform MCP Integration Deployment Complete!"
echo "=================================================="
echo ""
echo "🚀 To start the system:"
echo "   bash start-ajob4agent.sh"
echo ""
echo "🧪 To test the integration:"
echo "   node test-10-platform-integration.js"
echo ""
echo "🛑 To stop the system:"
echo "   bash stop-ajob4agent.sh"
echo ""
echo "📊 Platform Coverage Achieved:"
echo "   • Total Platforms: 10"
echo "   • JobSpy MCP: 4 platforms"
echo "   • Enterprise APIs: 3 platforms" 
echo "   • Custom MCP Servers: 3 platforms"
echo ""
echo "🔧 Next Steps:"
echo "   1. Configure API keys in .env file"
echo "   2. Start the system with: bash start-ajob4agent.sh"
echo "   3. Test with: node test-10-platform-integration.js"
echo "   4. Access unified search at: http://localhost:8080/api/unified/search-all"
echo ""
echo "✅ Ready for production deployment!"