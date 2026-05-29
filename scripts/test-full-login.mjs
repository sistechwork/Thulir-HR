import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, setCookie, headers: res.headers }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  const postData = JSON.stringify({ email: "vcodezmanager@gmail.com", password: "VCodezhrm@2025" });
  
  console.log("=== Step 1: Login ===");
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);
  
  console.log("Login status:", loginRes.statusCode);
  console.log("Login body:", loginRes.data);
  console.log("Set-Cookie header:", loginRes.setCookie);
  
  if (!loginRes.setCookie || loginRes.setCookie.length === 0) {
    console.log("ERROR: No session cookie returned from login!");
    return;
  }
  
  // Extract the session cookie
  const cookie = loginRes.setCookie[0].split(';')[0];
  console.log("Using cookie:", cookie);

  // Wait a moment for session to propagate
  await new Promise(r => setTimeout(r, 200));
  
  console.log("\n=== Step 2: Fetch /api/auth/user ===");
  const authRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/user',
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });
  
  console.log("Auth status:", authRes.statusCode);
  console.log("Auth body:", authRes.data);
  
  if (authRes.statusCode === 200) {
    console.log("\n✓ SUCCESS: Session is working! User is authenticated.");
  } else {
    console.log("\n✗ FAILURE: Session cookie not recognized. Auth check failed.");
  }
}

run().catch(console.error);
