/**
 * Script para probar los endpoints del API (ejecutar con: node scripts/test-api.js)
 * Asegúrate de tener el servidor levantado: npm run dev
 */
const http = require('http');
const BASE = 'http://localhost:3056';
const url = new URL(BASE);

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname,
      port: url.port || 3056,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        let data;
        try {
          data = chunks ? JSON.parse(chunks) : null;
        } catch {
          data = chunks;
        }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== Probando API AvaRunners ===\n');

  // 1. Raíz
  let r = await request('GET', '/');
  console.log('1. GET /:', r.status === 200 ? 'OK' : 'FALLO', r.status, r.data?.mensaje || r.data);

  // 2. Equipos para registro
  r = await request('GET', '/equipos/para-registro');
  console.log('2. GET /equipos/para-registro:', r.status === 200 ? 'OK' : 'FALLO', r.status);
  if (r.data?.datos?.length) {
    console.log('   Equipos:', r.data.datos.length, '- IDs:', r.data.datos.map(e => e.id).join(', '));
  }

  // 3. Registro paso 1
  const email = `test${Date.now()}@test.com`;
  const usuario = `user${Date.now()}`;
  r = await request('POST', '/auth/registrar-paso1', {
    nombreUsuario: usuario,
    email,
    contrasena: 'Test1234',
    confirmarContrasena: 'Test1234',
  });
  console.log('3. POST /auth/registrar-paso1:', r.status === 201 ? 'OK' : 'FALLO', r.status);
  if (r.status !== 201) {
    console.log('   Respuesta:', JSON.stringify(r.data, null, 2));
    return;
  }
  const tokenAcceso = r.data?.datos?.tokenAcceso;
  const refreshToken = r.data?.datos?.refreshToken;
  console.log('   tokenAcceso:', tokenAcceso ? 'recibido' : 'NO');
  console.log('   refreshToken:', refreshToken ? 'recibido' : 'NO');
  console.log('   usuario.equipo (paso1):', r.data?.datos?.usuario?.equipo);

  // 4. Registro paso 2 (avatar)
  r = await request('PUT', '/auth/registrar-paso2', { urlAvatar: 'https://res.cloudinary.com/ejemplo/avatar.png' }, tokenAcceso);
  console.log('4. PUT /auth/registrar-paso2:', r.status === 200 ? 'OK' : 'FALLO', r.status);

  // 5. Obtener ID del primer equipo para paso 3
  const equiposRes = await request('GET', '/equipos/para-registro');
  const equipoId = equiposRes.data?.datos?.[0]?.id;
  if (!equipoId) {
    console.log('5. No hay equipoId para paso 3, omitiendo.');
  } else {
    r = await request('PUT', '/auth/registrar-paso3', { equipoId }, tokenAcceso);
    console.log('5. PUT /auth/registrar-paso3:', r.status === 200 ? 'OK' : 'FALLO', r.status, 'equipoId:', equipoId);
  }

  // 6. Login (mismo usuario)
  r = await request('POST', '/auth/iniciar-sesion', { email, contrasena: 'Test1234' });
  console.log('6. POST /auth/iniciar-sesion:', r.status === 200 ? 'OK' : 'FALLO', r.status);
  const tokenLogin = r.data?.datos?.tokenAcceso;
  const refreshLogin = r.data?.datos?.refreshToken;
  console.log('   refreshToken en login:', refreshLogin ? 'recibido' : 'NO');

  // 7. Refrescar token
  r = await request('POST', '/auth/refrescar-token', { refreshToken: refreshLogin || refreshToken });
  console.log('7. POST /auth/refrescar-token:', r.status === 200 ? 'OK' : 'FALLO', r.status);

  // 8. Mi perfil
  const tokenFinal = r.status === 200 ? r.data?.datos?.tokenAcceso : tokenLogin;
  r = await request('GET', '/auth/mi-perfil', null, tokenFinal);
  console.log('8. GET /auth/mi-perfil:', r.status === 200 ? 'OK' : 'FALLO', r.status);
  if (r.data?.datos) console.log('   ranking:', r.data.datos.ranking, 'kmTotales:', r.data.datos.kmTotales);

  console.log('\n=== Fin de pruebas ===');
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('¿Está el servidor levantado? Ejecuta: npm run dev');
  }
  process.exit(1);
});
