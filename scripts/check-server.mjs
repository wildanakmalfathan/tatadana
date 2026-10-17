async function check() {
  const routes = ['/login', '/register', '/admin/login', '/api/wallets']
  for (const r of routes) {
    try {
      const res = await fetch('http://localhost:3000' + r)
      console.log(`${r} -> HTTP ${res.status}`)
    } catch (e) {
      console.log(`${r} -> Error: ${e.message}`)
    }
  }
}
check()
