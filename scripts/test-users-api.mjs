import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, setCookie }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log("Logging in...");
  const postData = JSON.stringify({ email: "vcodezmanager@gmail.com", password: "VCodezhrm@2025" });
  
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
  console.log("Login data:", loginRes.data);
  
  const cookie = loginRes.setCookie ? loginRes.setCookie[0] : '';
  
  if (!cookie) {
    console.log("No cookie, aborting.");
    return;
  }
  
  console.log("Fetching users...");
  const usersRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users',
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });
  
  console.log("Users status:", usersRes.statusCode);
  const users = JSON.parse(usersRes.data);
  console.log("Total Users:", users.length);
  if (users.length > 0) {
    console.log("Users snippet:", users.slice(0, 3));
  } else {
    console.log("No users found.");
  }
}

run();
