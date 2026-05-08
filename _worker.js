export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. API Endpoint: Bikin Link Pendek
    if (request.method === 'POST' && path === '/api/create') {
      try {
        const { target_url } = await request.json();
        if (!target_url || !target_url.startsWith('http')) {
          return new Response(JSON.stringify({ error: "URL tidak valid" }), { status: 400 });
        }

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

        await env.SAFELINK_KV.put(code, target_url);

        return new Response(JSON.stringify({ success: true, shortUrl: `${url.origin}/${code}` }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // 2. API Endpoint: Ambil Link Asli
    if (request.method === 'GET' && path.startsWith('/api/get/')) {
      const code = path.split('/')[3]; 
      const target = await env.SAFELINK_KV.get(code);
      
      if (target) {
        return new Response(JSON.stringify({ url: target }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: "Link expired/tidak ditemukan" }), { status: 404 });
    }

    // 3. Akses Link Pendek (domain.com/Acak12) -> TANPA REDIRECT!
    if (request.method === 'GET' && path !== '/' && !path.includes('.')) {
      const code = path.substring(1); // Ambil Kodenya
      const exists = await env.SAFELINK_KV.get(code); // Cek ada gak di KV
      
      if (exists) {
        // TAMPILIN TASK.HTML LANGSUNG, TANPA NGAMBIL NAMA URL-NYA!
        const taskPage = await env.ASSETS.fetch(new Request(new URL('/task.html', request.url)));
        return new Response(taskPage.body, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }

    // 4. Load file statis biasa (index.html dll)
    return env.ASSETS.fetch(request);
  }
};
