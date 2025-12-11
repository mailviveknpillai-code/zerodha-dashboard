require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const axios = require('axios');
const crypto = require('crypto');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || crypto.randomBytes(32).toString('hex');
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Redis client
const redisClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// Cloudflare API headers
const CLOUDFLARE_HEADERS = {
  'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
  'Content-Type': 'application/json'
};

// Redis key helpers
const REDIS_KEYS = {
  installToken: (token) => `install:token:${token}`,
  tunnel: (tunnelId) => `tunnel:${tunnelId}`,
  tunnelByMachine: (machineId) => `tunnel:machine:${machineId}`,
  tunnelsByCustomer: (customerId) => `tunnels:customer:${customerId}`
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files for downloads
app.use('/api/download', express.static(uploadsDir));

// Middleware: Admin authentication
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'] || req.body.adminApiKey;
  if (!ADMIN_API_KEY || apiKey === ADMIN_API_KEY) {
    return next();
  }
  return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid admin API key' });
};

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    res.json({
      status: 'ok',
      redis: redisStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      redis: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate installation token
app.post('/api/generate-token', authenticateAdmin, async (req, res) => {
  try {
    const { customerId, expiresIn = 86400 } = req.body; // Default 24 hours
    
    if (!customerId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'customerId is required' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const tokenData = {
      token,
      customerId,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      usedAt: null
    };

    // Store in Redis with expiration
    await redisClient.set(
      REDIS_KEYS.installToken(token),
      JSON.stringify(tokenData),
      { EX: expiresIn }
    );

    res.json({
      token,
      customerId,
      expiresAt: expiresAt.toISOString(),
      expiresIn
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'TOKEN_GENERATION_FAILED', message: error.message });
  }
});

// Validate install token
async function validateInstallToken(token) {
  if (!token) return null;
  
  const tokenDataStr = await redisClient.get(REDIS_KEYS.installToken(token));
  if (!tokenDataStr) return null;
  
  const tokenData = JSON.parse(tokenDataStr);
  
  // Check if expired
  if (new Date(tokenData.expiresAt) < new Date()) {
    return null;
  }
  
  // Check if already used
  if (tokenData.usedAt) {
    return null;
  }
  
  return tokenData;
}

// Generate credentials ZIP
async function generateCredentialsZip(tunnelId, credentials, publicHostname, baseUrl) {
  return new Promise((resolve, reject) => {
    const zipFileName = `credentials-${tunnelId}.zip`;
    const zipFilePath = path.join(uploadsDir, zipFileName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const downloadUrl = `${baseUrl}/api/download/${zipFileName}`;
      resolve(downloadUrl);
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    // Add credentials.json
    archive.append(JSON.stringify(credentials, null, 2), { name: 'credentials.json' });

    // Add config.yml template
    const configYml = `tunnel: ${tunnelId}
credentials-file: credentials.json

ingress:
  - hostname: ${publicHostname}
    service: http://127.0.0.1:9000
  - service: http_status:404
`;
    archive.append(configYml, { name: 'config.yml' });

    archive.finalize();
  });
}

// Provision Cloudflare tunnel (SIMPLIFIED - No token validation for single client)
app.post('/api/provision-tunnel', async (req, res) => {
  console.log('========================================');
  console.log('PROVISION REQUEST RECEIVED');
  console.log('========================================');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Validate Cloudflare credentials first
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.error('Missing Cloudflare credentials!');
      console.error('CLOUDFLARE_ACCOUNT_ID:', CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING');
      console.error('CLOUDFLARE_API_TOKEN:', CLOUDFLARE_API_TOKEN ? 'SET' : 'MISSING');
      return res.status(500).json({ 
        error: 'CONFIGURATION_ERROR', 
        message: 'Cloudflare credentials not configured. Please check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.'
      });
    }
    
    const { installToken, machineId, displayName, forceNew = false } = req.body;
    
    // Only require machineId (token is optional for single client)
    if (!machineId) {
      console.error('Missing machineId in request');
      return res.status(400).json({ 
        error: 'INVALID_REQUEST', 
        message: 'machineId is required' 
      });
    }
    
    console.log('Machine ID:', machineId);
    console.log('Force new:', forceNew);
    
    // Ensure Redis is connected
    if (!redisClient.isReady) {
      console.log('Connecting to Redis...');
      try {
        await redisClient.connect();
        console.log('Redis connected successfully');
      } catch (redisError) {
        console.error('Redis connection failed:', redisError);
        // Continue anyway - Redis is optional for single client
      }
    }
    
    // SIMPLIFIED: Use default customer ID for single client (no token validation)
    const customerId = 'default-client';
    console.log('Using customer ID:', customerId);
  
    // SIMPLIFIED: Always create new tunnel or reuse existing (no prompts)
    // If tunnel exists and forceNew is true, delete it first
    if (forceNew && redisClient.isReady) {
      try {
        const existingTunnelKey = await redisClient.get(REDIS_KEYS.tunnelByMachine(machineId));
        if (existingTunnelKey) {
          const existingTunnel = await redisClient.get(existingTunnelKey);
          if (existingTunnel) {
            const tunnelData = JSON.parse(existingTunnel);
            if (tunnelData.status === 'active' && tunnelData.tunnelId) {
              console.log(`Deleting existing tunnel ${tunnelData.tunnelId}...`);
              try {
                await axios.delete(
                  `${CLOUDFLARE_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${tunnelData.tunnelId}`,
                  { headers: CLOUDFLARE_HEADERS }
                );
                console.log('Existing tunnel deleted');
              } catch (deleteError) {
                console.warn('Failed to delete existing tunnel (continuing anyway):', deleteError.message);
              }
            }
          }
        }
      } catch (redisError) {
        console.warn('Could not check for existing tunnel (continuing anyway):', redisError.message);
      }
    }
    
    // Create Cloudflare Tunnel
    const tunnelName = `client-${machineId.substring(0, 8)}-${Date.now()}`;
    console.log('Creating Cloudflare tunnel...');
    console.log('API URL:', `${CLOUDFLARE_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel`);
    console.log('Account ID:', CLOUDFLARE_ACCOUNT_ID);
    console.log('Tunnel name:', tunnelName);
    
    let tunnelResponse;
    try {
      tunnelResponse = await axios.post(
        `${CLOUDFLARE_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel`,
        {
          name: tunnelName,
          config: {
            ingress: [
              {
                service: 'http://127.0.0.1:9000'
              },
              {
                service: 'http_status:404'
              }
            ]
          }
        },
        { headers: CLOUDFLARE_HEADERS }
      );
      console.log('Tunnel created successfully. Response:', JSON.stringify(tunnelResponse.data, null, 2));
    } catch (tunnelError) {
      console.error('Cloudflare tunnel creation failed:');
      console.error('Status:', tunnelError.response?.status);
      console.error('Response:', JSON.stringify(tunnelError.response?.data, null, 2));
      throw tunnelError;
    }
    
    const tunnel = tunnelResponse.data.result;
    if (!tunnel || !tunnel.id) {
      throw new Error('Invalid tunnel response from Cloudflare API');
    }
    
    // Get credentials - Cloudflare API returns credentials in the response
    // If credentials_file is not in the response, we need to fetch it separately
    let credentials = tunnel.credentials_file;
    if (!credentials) {
      // Try to get credentials from the tunnel response or fetch separately
      console.warn('credentials_file not in tunnel creation response, attempting to fetch...');
      try {
        const credsResponse = await axios.get(
          `${CLOUDFLARE_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${tunnel.id}`,
          { headers: CLOUDFLARE_HEADERS }
        );
        credentials = credsResponse.data.result?.credentials_file || credsResponse.data.result?.credentials;
      } catch (credsError) {
        console.error('Failed to fetch credentials:', credsError);
        // Continue with empty credentials - will be generated by Cloudflare
        credentials = null;
      }
    } 
    
    const publicHostname = `${tunnel.id}.cfargotunnel.com`;
    
    // Update tunnel config with the subdomain hostname
    await axios.put(
      `${CLOUDFLARE_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${tunnel.id}/configurations`,
      {
        config: {
          ingress: [
            {
              hostname: publicHostname,
              service: 'http://127.0.0.1:9000'
            },
            {
              service: 'http_status:404'
            }
          ]
        }
      },
      { headers: CLOUDFLARE_HEADERS }
    );
    
    // Save to Redis (optional - continue even if Redis fails)
    const tunnelData = {
      tunnelId: tunnel.id,
      customerId: customerId,
      machineId: machineId,
      hostname: publicHostname,
      credentials: credentials,
      status: 'active',
      createdAt: new Date().toISOString(),
      revokedAt: null
    };
    
    try {
      if (redisClient.isReady) {
        await redisClient.set(
          REDIS_KEYS.tunnel(tunnel.id),
          JSON.stringify(tunnelData)
        );
        
        await redisClient.set(
          REDIS_KEYS.tunnelByMachine(machineId),
          REDIS_KEYS.tunnel(tunnel.id)
        );
        
        await redisClient.sAdd(
          REDIS_KEYS.tunnelsByCustomer(customerId),
          tunnel.id
        );
        console.log('Tunnel data saved to Redis');
      }
    } catch (redisError) {
      console.warn('Failed to save to Redis (continuing anyway):', redisError.message);
      // Continue - Redis is optional for single client
    }
    
    // Generate credentials ZIP (only if credentials exist)
    let zipUrl = null;
    if (credentials) {
      try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        zipUrl = await generateCredentialsZip(tunnel.id, credentials, publicHostname, baseUrl);
      } catch (zipError) {
        console.error('Failed to generate credentials ZIP:', zipError);
        // Continue without ZIP URL - credentials can be downloaded separately
      }
    } else {
      console.warn('No credentials available, skipping ZIP generation');
    }
    
    console.log('========================================');
    console.log('PROVISION SUCCESS');
    console.log('========================================');
    console.log('Tunnel ID:', tunnel.id);
    console.log('Public Hostname:', publicHostname);
    console.log('Customer ID:', customerId);
    
    res.json({
      publicHostname: publicHostname,
      tunnelId: tunnel.id,
      customerId: customerId,
      downloadUrl: zipUrl
    });
  } catch (error) {
    console.error('========================================');
    console.error('PROVISIONING ERROR - Full Details:');
    console.error('========================================');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response headers:', error.response.headers);
    }
    
    if (error.request) {
      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
    }
    
    console.error('========================================');
    
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error occurred';
    
    // Ensure we always send a response, even if there's an error
    try {
      res.status(500).json({ 
        error: 'PROVISIONING_FAILED', 
        message: errorMessage,
        details: error.response?.data?.errors || error.response?.data,
        statusCode: error.response?.status,
        requestBody: req.body // Include request body for debugging
      });
    } catch (responseError) {
      // If we can't send JSON, try plain text
      console.error('Failed to send JSON error response:', responseError);
      try {
        res.status(500).send(`PROVISIONING_FAILED: ${errorMessage}`);
      } catch (finalError) {
        console.error('Failed to send any error response:', finalError);
      }
    }
  }
});

// Get tunnel credentials for existing tunnel
app.post('/api/get-tunnel-credentials', authenticateAdmin, async (req, res) => {
  try {
    const { tunnelId } = req.body;
    if (!tunnelId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'tunnelId is required' });
    }
  
    const tunnelDataStr = await redisClient.get(REDIS_KEYS.tunnel(tunnelId));
    if (!tunnelDataStr) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tunnel not found' });
    }
  
    const tunnelData = JSON.parse(tunnelDataStr);
    if (tunnelData.status !== 'active') {
      return res.status(400).json({ error: 'TUNNEL_INACTIVE', message: 'Tunnel is not active' });
    }
  
    // Generate credentials ZIP for existing tunnel
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const zipUrl = await generateCredentialsZip(tunnelData.tunnelId, tunnelData.credentials, tunnelData.hostname, baseUrl);
  
    res.json({
      tunnelId: tunnelData.tunnelId,
      publicHostname: tunnelData.hostname,
      customerId: tunnelData.customerId,
      credentials: tunnelData.credentials,
      downloadUrl: zipUrl
    });
  } catch (error) {
    console.error('Error retrieving tunnel credentials:', error);
    res.status(500).json({ error: 'CREDENTIAL_RETRIEVAL_FAILED', message: error.message });
  }
});

// Start server
async function startServer() {
  try {
    // Connect to Redis
    if (!redisClient.isReady) {
      await redisClient.connect();
      console.log('Connected to Redis');
    }

    // Validate Cloudflare credentials
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.error('ERROR: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in .env file');
      process.exit(1);
    }

    // Log admin API key (first time only)
    if (!process.env.ADMIN_API_KEY) {
      console.log('\n========================================');
      console.log('ADMIN API KEY (save this to .env):');
      console.log(`ADMIN_API_KEY=${ADMIN_API_KEY}`);
      console.log('========================================\n');
    }

    app.listen(PORT, () => {
      console.log(`Provisioning API running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (redisClient.isReady) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  if (redisClient.isReady) {
    await redisClient.quit();
  }
  process.exit(0);
});

startServer();

