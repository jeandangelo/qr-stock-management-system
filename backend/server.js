// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db'); // Importa tu configuración de la base de datos (db.js)

const app = express();
app.use(express.json()); // Middleware para parsear el cuerpo de las solicitudes JSON
app.use(cors()); // Habilita CORS para todas las rutas (permite comunicación con el frontend)

// Obtener el puerto del backend desde .env o usar 3001 por defecto
const BACKEND_PORT = process.env.BACKEND_PORT || 3001;

// Middleware para que el 'pool' de conexión a la base de datos esté disponible en 'req.db'
app.use((req, res, next) => {
  req.db = pool;
  next(); // Pasa el control al siguiente middleware o ruta
});

// --- Rutas de la API para la gestión de inventario y dashboard ---

// 1. ENDPOINTS PARA EL DASHBOARD
// ================================================================

// GET: Estadísticas del Dashboard
// URL: http://localhost:3001/api/dashboard/stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalProductsResult = await req.db.query('SELECT COUNT(*) FROM productos');
    const totalProducts = parseInt(totalProductsResult.rows[0].count || '0');

    // Asume que 'productos' tiene una columna 'precio'
    const totalValuedStockResult = await req.db.query('SELECT SUM(stock * precio) AS total_valor FROM productos');
    const totalValuedStock = parseFloat(totalValuedStockResult.rows[0].total_valor || '0');

    // Puedes hacer este umbral configurable en tu .env o directamente aquí
    const lowStockThreshold = 10;
    const lowStockResult = await req.db.query('SELECT COUNT(*) FROM productos WHERE stock <= $1', [lowStockThreshold]);
    const lowStockItems = parseInt(lowStockResult.rows[0].count || '0');

    const today = new Date().toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'
    const movementsTodayResult = await req.db.query(
        `SELECT COUNT(*) FROM movimientos_inventario WHERE DATE(fecha_movimiento) = $1`, [today]
    );
    const movementsToday = parseInt(movementsTodayResult.rows[0].count || '0');

    res.json({
      totalProducts,
      totalValuedStock,
      lowStockItems,
      movementsToday
    });
  } catch (err) {
    console.error('Error al obtener estadísticas del dashboard:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET: Actividad Reciente (para el Dashboard)
// URL: http://localhost:3001/api/dashboard/recent-activity
app.get('/api/dashboard/recent-activity', async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT
          mi.id,
          p.nombre AS product_name,
          mi.tipo_movimiento AS type,
          mi.cantidad AS quantity,
          TO_CHAR(mi.fecha_movimiento, 'HH24:MI AM') AS time
      FROM
          movimientos_inventario mi
      JOIN
          productos p ON mi.producto_id = p.id
      ORDER BY
          mi.fecha_movimiento DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener actividad reciente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET: Alertas de Stock Bajo (para el Dashboard y el Inventario)
// URL: http://localhost:3001/api/products/low-stock
app.get('/api/products/low-stock', async (req, res) => {
    try {
        const lowStockThreshold = 10; // Puedes hacer esto configurable, o tomarlo de la columna 'min_stock'
        const result = await req.db.query(
            'SELECT id, nombre AS product_name, stock AS current_stock, min_stock FROM productos WHERE stock <= min_stock ORDER BY stock ASC', // Usa min_stock de la tabla
            [] // No se necesitan parámetros si min_stock viene de la tabla
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener alertas de stock bajo:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// 2. ENDPOINTS PARA LA GESTIÓN DE PRODUCTOS (INVENTARIO)
// =========================================================

// GET: Obtener todos los ítems/productos
// URL: http://localhost:3001/api/items
app.get('/api/items', async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT
        p.id,
        p.nombre,
        p.codigo,
        p.stock,
        p.precio,
        p.descripcion,
        p.categoria,       -- Necesita columna 'categoria' en 'productos'
        p.min_stock,       -- Necesita columna 'min_stock' en 'productos'
        p.qr_code_data,    -- Datos del QR si los tienes
        (
            SELECT u.codigo_ubicacion
            FROM producto_ubicacion pu
            JOIN ubicaciones u ON pu.ubicacion_id = u.id
            WHERE pu.producto_id = p.id
            LIMIT 1 -- Obtiene una ubicación principal si hay varias
        ) AS ubicacion_principal
      FROM
        productos p
      ORDER BY
        p.nombre ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener los items:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST: Crear un nuevo ítem/producto
// URL: http://localhost:3001/api/items
// Cuerpo: { "nombre": "...", "descripcion": "...", "stock": ..., "precio": ..., "codigo": "...", "categoria": "...", "min_stock": ..., "qr_code_data": "...", "ubicacion_principal": "..." }
app.post('/api/items', async (req, res) => {
  const { nombre, descripcion, stock, precio, codigo, categoria, min_stock, qr_code_data, ubicacion_principal } = req.body;
  try {
    const result = await req.db.query(
      `INSERT INTO productos (nombre, descripcion, stock, precio, codigo, categoria, min_stock, qr_code_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre, descripcion, stock, precio, codigo, categoria, min_stock, qr_code_data]
    );

    const newProduct = result.rows[0];

    // Si se proporcionó una ubicación principal, intenta asociar el producto a ella
    if (ubicacion_principal) {
      const ubicacionResult = await req.db.query(
        `SELECT id FROM ubicaciones WHERE codigo_ubicacion = $1`,
        [ubicacion_principal]
      );
      if (ubicacionResult.rows.length > 0) {
        const ubicacionId = ubicacionResult.rows[0].id;
        // Inserta o actualiza la cantidad de este producto en esta ubicación
        await req.db.query(
          `INSERT INTO producto_ubicacion (producto_id, ubicacion_id, cantidad)
           VALUES ($1, $2, $3)
           ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad = producto_ubicacion.cantidad + EXCLUDED.cantidad`,
          [newProduct.id, ubicacionId, newProduct.stock] // Asocia el stock inicial a la ubicación
        );
      } else {
        console.warn(`Ubicación '${ubicacion_principal}' no encontrada para el nuevo producto ${newProduct.nombre}. No se asignó ubicación.`);
      }
    }

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Error al crear el item:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// PUT: Actualizar un ítem específico por ID
// URL: http://localhost:3001/api/items/:id
// Cuerpo: { "nombre": "...", "descripcion": "...", "stock": ..., "precio": ..., "codigo": "...", "categoria": "...", "min_stock": ..., "qr_code_data": "..." }
app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, stock, precio, codigo, categoria, min_stock, qr_code_data } = req.body;
  try {
    const result = await req.db.query(
      `UPDATE productos SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        stock = COALESCE($3, stock),
        precio = COALESCE($4, precio),
        codigo = COALESCE($5, codigo),
        categoria = COALESCE($6, categoria),
        min_stock = COALESCE($7, min_stock),
        qr_code_data = COALESCE($8, qr_code_data)
      WHERE id = $9 RETURNING *`,
      [nombre, descripcion, stock, precio, codigo, categoria, min_stock, qr_code_data, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// DELETE: Eliminar un ítem específico por ID
// URL: http://localhost:3001/api/items/:id
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Opcional: Primero elimina registros relacionados en 'movimientos_inventario' o 'producto_ubicacion'
    // si tienes restricciones de clave foránea que impiden eliminar un producto directamente.
    await req.db.query('DELETE FROM producto_ubicacion WHERE producto_id = $1', [id]);
    await req.db.query('DELETE FROM movimientos_inventario WHERE producto_id = $1', [id]);

    const result = await req.db.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(204).send(); // 204 No Content para eliminación exitosa
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// 3. ENDPOINTS PARA GESTIÓN DE MOVIMIENTOS (A FUTURO, POR EJEMPLO, PARA SCANNERVIEW)
// ===================================================================================

// POST: Registrar un movimiento de inventario (Entrada/Salida)
// URL: http://localhost:3001/api/movements
// Cuerpo: { "producto_id": ..., "tipo_movimiento": "Entrada" | "Salida", "cantidad": ..., "fecha_movimiento": "YYYY-MM-DD HH:MM:SS", "ubicacion_id": ... }
app.post('/api/movements', async (req, res) => {
  const { producto_id, tipo_movimiento, cantidad, ubicacion_id } = req.body;
  const fecha_movimiento = new Date(); // Usar la fecha actual del servidor

  try {
    await req.db.query('BEGIN'); // Iniciar transacción

    // 1. Registrar el movimiento
    const movementResult = await req.db.query(
      `INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, fecha_movimiento, ubicacion_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [producto_id, tipo_movimiento, cantidad, fecha_movimiento, ubicacion_id]
    );

    // 2. Actualizar el stock del producto
    const updateStockQuery = tipo_movimiento === 'Entrada'
      ? 'UPDATE productos SET stock = stock + $1 WHERE id = $2 RETURNING *'
      : 'UPDATE productos SET stock = stock - $1 WHERE id = $2 RETURNING *';

    const productUpdateResult = await req.db.query(updateStockQuery, [cantidad, producto_id]);

    if (productUpdateResult.rows.length === 0) {
      throw new Error('Producto no encontrado al actualizar stock');
    }

    // 3. Actualizar la cantidad en la tabla producto_ubicacion
    if (ubicacion_id) {
        const updateUbicacionQuery = tipo_movimiento === 'Entrada'
            ? 'UPDATE producto_ubicacion SET cantidad = cantidad + $1 WHERE producto_id = $2 AND ubicacion_id = $3 RETURNING *'
            : 'UPDATE producto_ubicacion SET cantidad = cantidad - $1 WHERE producto_id = $2 AND ubicacion_id = $3 RETURNING *';

        const ubicacionUpdateResult = await req.db.query(updateUbicacionQuery, [cantidad, producto_id, ubicacion_id]);

        if (ubicacionUpdateResult.rows.length === 0 && tipo_movimiento === 'Entrada') {
            // Si no existía la relación producto-ubicación y es una entrada, créala
            await req.db.query(
                `INSERT INTO producto_ubicacion (producto_id, ubicacion_id, cantidad)
                 VALUES ($1, $2, $3)`,
                [producto_id, ubicacion_id, cantidad]
            );
        } else if (ubicacionUpdateResult.rows.length === 0 && tipo_movimiento === 'Salida') {
             // Manejar caso de salida de una ubicación no registrada o sin stock
             // Aquí podrías loggear un error o lanzar una excepción, dependiendo de tu lógica de negocio
             console.warn(`Intento de salida de producto ${producto_id} de ubicación ${ubicacion_id} sin registro previo.`);
        }
    }


    await req.db.query('COMMIT'); // Confirmar la transacción
    res.status(201).json(movementResult.rows[0]);

  } catch (err) {
    await req.db.query('ROLLBACK'); // Revertir la transacción en caso de error
    console.error('Error al registrar movimiento o actualizar stock:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// 4. ENDPOINTS PARA GESTIÓN DE UBICACIONES (A FUTURO, PARA LOCATIONSVIEW)
// ========================================================================

// GET: Obtener todas las ubicaciones
// URL: http://localhost:3001/api/locations
app.get('/api/locations', async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM ubicaciones ORDER BY codigo_ubicacion ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ubicaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST: Crear una nueva ubicación
// URL: http://localhost:3001/api/locations
// Cuerpo: { "codigo_ubicacion": "...", "descripcion": "..." }
app.post('/api/locations', async (req, res) => {
  const { codigo_ubicacion, descripcion } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO ubicaciones (codigo_ubicacion, descripcion) VALUES ($1, $2) RETURNING *',
      [codigo_ubicacion, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear ubicación:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// Iniciar el servidor backend
app.listen(BACKEND_PORT, () => {
  console.log(`🚀 Backend server listening on port ${BACKEND_PORT}`);
});