export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. API Endpoint: Bikin Link Pendek (Method POST)
    if (request.method === 'POST' && path === '/api/create') {
      try {
        const { target_url } = await request.json();
        if (!target_url || !target_url.startsWith('http')) {
          return new Response(JSON.stringify({ error: "URL tidak valid" }), { status: 400 });
        }

        // Generate kode acak 6 karakter
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

        // Simpan ke KV (Key = Kode, Value = URL Asli)
        await env.SAFELINK_KV.put(code, target_url);

        return new Response(JSON.stringify({ success: true, shortUrl: `${url.origin}/${code}` }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // 2. API Endpoint: Ambil Link Asli buat Halaman Task (Method GET)
    if (request.method === 'GET' && path.startsWith('/api/get/')) {
      const code = path.split('/')[3]; // ambil [code] dari /api/get/[code]
      const target = await env.SAFELINK_KV.get(code);
      
      if (target) {
        return new Response(JSON.stringify({ url: target }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: "Link expired/tidak ditemukan" }), { status: 404 });
    }

    // 3. Deteksi Kunjungan Link Pendek (Contoh: domain.com/aBcD12)
    // Jika path bukan '/', bukan '/task.html', dan nggak ada titik (bukan file statis)
    if (request.method === 'GET' && path !== '/' && !path.includes('.')) {
      const code = path.substring(1); // Hilangkan '/' di depan
      const exists = await env.SAFELINK_KV.get(code);
      
      if (exists) {
        // Redirect pengunjung ke task.html sambil bawa ID
        return Response.redirect(`${url.origin}/task.html?id=${code}`, 302);
      }
    }

    // 4. Sisanya: Load file statis biasa (index.html & task.html)
    return env.ASSETS.fetch(request);
  }
};
