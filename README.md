🚀 High-Performance Pagination & Rate Limiting API

Este proyecto es una API RESTful construida con Node.js, Express, PostgreSQL y Redis, diseñada para demostrar técnicas avanzadas de optimización de bases de datos y seguridad a nivel de infraestructura.

El núcleo del proyecto radica en la comparación práctica entre la paginación tradicional (OFFSET) y la Paginación por Cursor (Keyset Pagination) sobre una base de datos con 5 millones de registros, demostrando cómo mantener tiempos de respuesta de milisegundos a gran escala. Además, implementa un middleware de Rate Limiting respaldado por Redis para proteger la API contra abusos.

🛠️ Tecnologías Utilizadas

Backend: Node.js, Express

Base de Datos: PostgreSQL 16

Caché & Rate Limiting: Redis 7

Infraestructura: Docker, Docker Compose

⚙️ Guía de Instalación y Ejecución

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina local.

1. Requisitos Previos

Docker y Docker Compose instalados.

Node.js instalado.

2. Levantar los Contenedores

Abre tu terminal en la raíz del proyecto y levanta los servicios de PostgreSQL y Redis en segundo plano:

docker compose up -d


3. Poblar la Base de Datos (5 Millones de Registros)

Debemos inyectar el script SQL para crear la tabla, insertar los datos de prueba y generar el índice B-Tree.

Si usas Linux, Mac o CMD:

docker exec -i postgres_db psql -U admin -d dev_database < script.sql


Si usas PowerShell (Windows):

Get-Content script.sql | docker exec -i postgres_db psql -U admin -d dev_database


(Nota: La inserción masiva puede tardar unos segundos. Espera a que termine antes de continuar).

4. Instalar Dependencias e Iniciar la API

Instala los paquetes de Node (express, pg, redis) e inicia el servidor:

npm install
node index.js


La API estará disponible en http://localhost:4000.

📖 Arquitectura y Teoría: ¿Por qué este enfoque?

Paginación Tradicional (OFFSET) vs Paginación por Cursor

Cuando trabajas con tablas masivas, la forma en que paginas los datos define el rendimiento de tu aplicación:

❌ Ruta Lenta (/api/lenta): Paginación con OFFSET

Cómo funciona: Usa la cláusula LIMIT X OFFSET Y. Si pides la página 50,000, la base de datos lee secuencialmente, carga en memoria y luego descarta las primeras 4,999,900 filas para entregarte las últimas 100.

Complejidad: O(n). Cuanto más profunda es la página que solicitas, más lenta será la consulta.

✅ Ruta Rápida (/api/rapida): Paginación por Cursor

Cómo funciona: Aprovecha la cláusula WHERE id > ultimo_id_visto. Utiliza un índice B-Tree creado en la columna id.

Complejidad: O(log n). El motor de búsqueda navega por el árbol binario para encontrar el ID exacto en milisegundos, ignorando todas las filas anteriores. El tiempo de respuesta es casi instantáneo y constante, sin importar si estás en la primera o en la última página.

Rate Limiting con Redis

Exponer una API optimizada no sirve de nada si un bot malicioso puede hacer miles de peticiones por segundo y saturar el ancho de banda o la CPU del servidor.

Para mitigar esto, implementamos un Rate Limiter:

En memoria: Se utiliza Redis porque trabaja directamente en la memoria RAM, lo que permite verificaciones atómicas en microsegundos sin afectar el rendimiento de la API.

Operación Atómica: Se asocia la IP del usuario a una clave. Mediante el comando INCR, contamos las peticiones. Si dos peticiones llegan al mismo tiempo, Redis garantiza matemáticamente que el contador sea preciso.

Ventana de Tiempo: Aplicamos un "Time To Live" (TTL). Si el usuario supera el límite (ej. 15 peticiones en 60 segundos), la API aborta la ejecución y responde con un código HTTP 429 Too Many Requests, protegiendo de manera efectiva a la base de datos subyacente.