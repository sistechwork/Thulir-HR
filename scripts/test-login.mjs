async function run() {
  console.log("Testing login...");
  try {
    const res = await fetch("http://localhost:5002/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: "admin", // Try common username
        password: "password"
      })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

run();
