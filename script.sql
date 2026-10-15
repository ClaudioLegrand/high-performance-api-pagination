-- 1. Creación de la tabla
CREATE TABLE registro_transacciones (
    id SERIAL,
    cliente_id INT NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserción masiva de 5 millones de filas usando generate_series()
-- Se generan IDs de clientes entre 1 y 100,000, montos aleatorios y fechas de los últimos 365 días.
INSERT INTO registro_transacciones (cliente_id, monto, fecha_transaccion)
SELECT 
    trunc(random() * 100000 + 1)::INT, 
    round((random() * 10000 + 1)::NUMERIC, 2),
    NOW() - (random() * (interval '365 days'))
FROM generate_series(1, 5000000);

-- 3. Creación explícita del índice B-Tree en la columna ID
-- (Nota de arquitectura: Al usar SERIAL, PostgreSQL suele crear un índice implícito si se declara PRIMARY KEY. Aquí forzamos la creación explícita del B-Tree según el requerimiento).
CREATE INDEX idx_btree_registro_id ON registro_transacciones USING btree (id);