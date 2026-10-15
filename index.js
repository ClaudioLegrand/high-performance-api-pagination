const express = require('express');
const { Pool } = require('pg');
const redis = require('redis'); // Importamos el cliente de Redis

const app = express();
const port = 4000;

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'dev_database',
  password: 'password123',
  port: 5432,
});

// Configuración e inicialización de la conexión a Redis
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Error en Redis:', err));
redisClient.connect().catch(console.error);

/**
 * MIDDLEWARE: Rate Limiting usando Redis
 * Limita el tráfico a 15 peticiones por minuto por IP
 */
const rateLimiter = async (req, res, next) => {
  // En un entorno de producción detrás de un proxy (como Nginx o Docker), 
  // podrías necesitar req.headers['x-forwarded-for'] para obtener la IP real.
  const ip = req.ip; 
  const key = `rate_limit:${ip}`;

  try {
    // INCR incrementa el valor de la clave en 1. Si no existe, la crea con valor 1.
    const requests = await redisClient.incr(key);

    if (requests === 1) {
      // Si es la primera petición, le damos un tiempo de vida (TTL) de 60 segundos
      await redisClient.expire(key, 60);
    }

    if (requests > 15) {
      // Si supera el límite, cortamos la ejecución y devolvemos el código 429
      return res.status(429).json({ 
        error: 'Too Many Requests',
        message: 'Has superado el límite de 15 peticiones por minuto. Intenta de nuevo más tarde.'
      });
    }

    // Si todo está bien, permitimos que la petición continúe hacia la ruta correspondiente
    next();
  } catch (error) {
    console.error('Error en el middleware de Redis:', error);
    // Como buena práctica, si Redis falla, permitimos que la API siga funcionando
    next(); 
  }
};

// Aplicamos el middleware globalmente a todas las rutas de la API
app.use(rateLimiter);

// --- RUTAS DE LA API ---

app.get('/api/lenta', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await pool.query(
      'SELECT * FROM registro_transacciones ORDER BY id ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/rapida', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const cursor = parseInt(req.query.cursor) || 0;

  try {
    const result = await pool.query(
      'SELECT * FROM registro_transacciones WHERE id > $1 ORDER BY id ASC LIMIT $2',
      [cursor, limit]
    );
    
    const rows = result.rows;
    const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : null;

    res.json({ data: rows, nextCursor: nextCursor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});