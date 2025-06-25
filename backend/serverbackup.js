// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de entorno desde .env

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
    const totalProductsResult = await req.db.query('SELECT COUNT(*) FROM productos'.trim());
    const totalProducts = parseInt(totalProductsResult.rows[0].count || '0');

    const totalValuedStockResult = await req.db.query('SELECT COALESCE(SUM(p.stock * p.valor_unitario), 0) AS total_valor FROM productos p;'.trim());
    const totalValuedStock = parseFloat(totalValuedStockResult.rows[0].total_valor || '0');

    // Asegurarse de que lowStockResult se define ANTES de usarlo en lowStockItems
    const lowStockResult = await req.db.query(
      'SELECT COUNT(*) FROM productos WHERE stock <= min_stock;'.trim()
    );
    const lowStockItems = parseInt(lowStockResult.rows[0].count || '0');

    const today = new Date().toISOString().split('T')[0];
    const movementsTodayResult = await req.db.query(
      'SELECT COUNT(*) FROM movimientos WHERE DATE(fecha_movimiento) = $1'.trim(), [today]
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
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET: Actividad Reciente (para el Dashboard)
// URL: http://localhost:3001/api/dashboard/recent-activity
app.get('/api/dashboard/recent-activity', async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT
          mi.movimiento_id AS id,
          p.nombre AS product_name,
          mi.tipo_movimiento AS type,
          mi.cantidad AS quantity,
          TO_CHAR(mi.fecha_movimiento, 'HH24:MI AM') AS time,
          ulo.codigo_ubicacion AS ubicacion_origen_codigo,
          uld.codigo_ubicacion AS ubicacion_destino_codigo
      FROM
          movimientos mi
      JOIN
          productos p ON mi.producto_id = p.id -- Corregido: p.id
      LEFT JOIN
          ubicaciones ulo ON mi.ubicacion_origen_id = ulo.ubicacion_id
      LEFT JOIN
          ubicaciones uld ON mi.ubicacion_destino_id = uld.ubicacion_id
      ORDER BY
          mi.fecha_movimiento DESC
      LIMIT 5
    `.trim()); // Aplicar .trim()
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener actividad reciente:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET: Alertas de Stock Bajo (para el Dashboard y el Inventario)
// URL: http://localhost:3001/api/products/low-stock
app.get('/api/products/low-stock', async (req, res) => {
    try {
        // lowStockThreshold ya no es un parámetro para la consulta, se usa p.min_stock directamente.
        const result = await req.db.query(`
            SELECT
                p.id,
                p.nombre AS product_name,
                p.stock AS current_stock,
                p.min_stock,
                p.codigo_barra
            FROM
                productos p
            WHERE
                p.stock <= p.min_stock
            ORDER BY
                p.stock ASC;
        `.trim()); // Aplicar .trim()
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener alertas de stock bajo:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// 2. ENDPOINTS PARA LA GESTIÓN DE PRODUCTOS (INVENTARIO)
// =========================================================

// GET: Obtener todos los ítems/productos con su stock total (basado en 'stock' de la tabla productos)
// URL: http://localhost:3001/api/items
app.get('/api/items', async (req, res) => {
  try {
    const result = await req.db.query(`SELECT
        p.id, -- Corregido: p.id
        p.nombre,
        p.descripcion,
        p.codigo_barra,
        p.unidad_medida,
        p.fecha_creacion,
        p.stock,        -- Añadido: Stock directamente de la tabla productos
        p.min_stock,    -- Añadido: Min stock directamente de la tabla productos
        p.categoria,    -- Añadido: Categoría directamente de la tabla productos
        p.valor_unitario AS precio, -- Renombrado para que coincida con el frontend (value -> precio)
        p.ubicacion_principal -- Añadido: Ubicación principal directamente de la tabla productos
      FROM
        productos p
      ORDER BY
        p.nombre ASC
    `.trim());
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener los items:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET: Obtener un producto por ID
// URL: http://localhost:3001/api/items/:id
app.get('/api/items/:id', async (req, res) => {
    const { id } = req.params; // Aquí 'id' es el id del producto
    try {
      const result = await req.db.query('SELECT * FROM productos WHERE id = $1'.trim(), [id]); // Aplicar .trim()
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error al obtener el producto por ID:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

// POST: Crear un nuevo ítem/producto
// URL: http://localhost:3001/api/items
// Cuerpo esperado del frontend:
// { "code": "PROD006", "name": "Nombre", "category": "Electrónica",
//   "stock": 10, "minStock": 5, "location": "A1-01", "value": 12.50,
//   "supplier": "Proveedor XYZ", "codigo_barra": "1234567890" }
app.post('/api/items', async (req, res) => {
  const { name, description, codigo_barra, stock, minStock, value, category, location, supplier } = req.body;
  
  // Mapeo de nombres del frontend a nombres de la DB
  const nombre = name;
  const descripcion = description || name; // Si no se da descripción, usa el nombre
  const valor_unitario = value; // 'value' del frontend es 'valor_unitario' en la DB
  const categoria = category;
  const min_stock = minStock;
  const ubicacion_principal = location; // 'location' del frontend es 'ubicacion_principal' en la DB
  // 'supplier' no tiene un campo directo en 'productos' según el diagrama, se omite por ahora.
  // 'unidad_medida' tampoco se envía del frontend, se podría poner un valor por defecto o hacerla opcional.

  try {
    const productResult = await req.db.query(
      `INSERT INTO productos (nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario, categoria, ubicacion_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario AS precio, categoria, ubicacion_principal`.trim(), // Aplicar .trim()
      [nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario, categoria, ubicacion_principal]
    );
    const newProduct = productResult.rows[0];

    res.status(201).json(newProduct);

  } catch (err) {
    console.error('Error al crear el item:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// PUT: Actualizar un ítem específico por ID
// URL: http://localhost:3001/api/items/:id
// Cuerpo: { "nombre": "...", "descripcion": "...", "codigo_barra": "...", "unidad_medida": "..." }
app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params; // id es producto_id
  // Asumimos que los campos recibidos son los mismos que se pueden actualizar en la tabla productos
  const { nombre, descripcion, codigo_barra, unidad_medida, stock, min_stock, valor_unitario, categoria, ubicacion_principal } = req.body;
  try {
    const result = await req.db.query(
      `UPDATE productos SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        codigo_barra = COALESCE($3, codigo_barra),
        unidad_medida = COALESCE($4, unidad_medida),
        stock = COALESCE($5, stock),
        min_stock = COALESCE($6, min_stock),
        valor_unitario = COALESCE($7, valor_unitario),
        categoria = COALESCE($8, categoria),
        ubicacion_principal = COALESCE($9, ubicacion_principal)
      WHERE id = $10 RETURNING *`.trim(), // Aplicar .trim()
      [nombre, descripcion, codigo_barra, unidad_medida, stock, min_stock, valor_unitario, categoria, ubicacion_principal, id]
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
  const { id } = req.params; // id es el id del producto
  try {
    await req.db.query('BEGIN'); // Iniciar transacción

    // Eliminar registros relacionados en Inventario y Movimientos
    await req.db.query('DELETE FROM inventario WHERE producto_id = $1'.trim(), [id]); // Aplicar .trim()
    await req.db.query('DELETE FROM movimientos WHERE producto_id = $1'.trim(), [id]); // Aplicar .trim()

    const result = await req.db.query('DELETE FROM productos WHERE id = $1 RETURNING *'.trim(), [id]); // Aplicar .trim()
    if (result.rows.length === 0) {
      await req.db.query('ROLLBACK'); // Revertir si no se encuentra el producto
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    await req.db.query('COMMIT'); // Confirmar la transacción
    res.status(204).send(); // 204 No Content para eliminación exitosa
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// 3. ENDPOINTS PARA GESTIÓN DE MOVIMIENTOS (A FUTURO, POR EJEMPLO, PARA SCANNERVIEW)
// ===================================================================================

// POST: Registrar un movimiento de inventario (Entrada/Salida/Traslado)
// URL: http://localhost:3001/api/movements
// Cuerpo: { "producto_id": ..., "cantidad": ..., "tipo_movimiento": "ENTRADA" | "SALIDA" | "TRASLADO", "ubicacion_origen_id": ..., "ubicacion_destino_id": ..., "usuario_id": ..., "referencia_externa": ... }
app.post('/api/movements', async (req, res) => {
  const { producto_id, cantidad, tipo_movimiento, ubicacion_origen_id, ubicacion_destino_id, usuario_id, referencia_externa } = req.body;
  const fecha_movimiento = new Date(); // Usar la fecha actual del servidor

  try {
    await req.db.query('BEGIN'); // Iniciar transacción

    // 1. Validar y Registrar el movimiento
    // El trigger `trg_validar_stock_suficiente` en la DB manejará la validación de stock para SALIDA/TRASLADO
    const movementResult = await req.db.query(
      `INSERT INTO movimientos (producto_id, cantidad, tipo_movimiento, ubicacion_origen_id, ubicacion_destino_id, usuario_id, fecha_movimiento, referencia_externa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`.trim(), // Aplicar .trim()
      [producto_id, cantidad, tipo_movimiento, ubicacion_origen_id, ubicacion_destino_id, usuario_id, fecha_movimiento, referencia_externa]
    );

    // 2. Actualizar la tabla Inventario (stock real)
    // Lógica para actualizar Inventario según el tipo de movimiento

    if (tipo_movimiento === 'ENTRADA') {
      await req.db.query(
        `INSERT INTO inventario (producto_id, ubicacion_id, cantidad)
         VALUES ($1, $2, $3)
         ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad = inventario.cantidad + EXCLUDED.cantidad, fecha_actualizacion = CURRENT_TIMESTAMP`.trim(), // Aplicar .trim()
        [producto_id, ubicacion_destino_id, cantidad] // Entrada siempre a destino
      );
    } else if (tipo_movimiento === 'SALIDA') {
      // Se asume que el trigger ya validó stock suficiente
      await req.db.query(
        `UPDATE inventario SET cantidad = cantidad - $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE producto_id = $2 AND ubicacion_id = $3`.trim(), // Aplicar .trim()
        [cantidad, producto_id, ubicacion_origen_id] // Salida siempre de origen
      );
    } else if (tipo_movimiento === 'TRASLADO') {
      // Salida de origen
      await req.db.query(
        `UPDATE inventario SET cantidad = cantidad - $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE producto_id = $2 AND ubicacion_id = $3`.trim(), // Aplicar .trim()
        [cantidad, producto_id, ubicacion_origen_id]
      );
      // Entrada a destino
      await req.db.query(
        `INSERT INTO inventario (producto_id, ubicacion_id, cantidad)
         VALUES ($1, $2, $3)
         ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad = inventario.cantidad + EXCLUDED.cantidad, fecha_actualizacion = CURRENT_TIMESTAMP`.trim(), // Aplicar .trim()
        [producto_id, ubicacion_destino_id, cantidad]
      );
    }

    await req.db.query('COMMIT'); // Confirmar la transacción
    res.status(201).json(movementResult.rows[0]);

  } catch (err) {
    await req.db.query('ROLLBACK'); // Revertir la transacción en caso de error
    console.error('Error al registrar movimiento o actualizar stock:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET: Obtener todos los movimientos
// URL: http://localhost:3001/api/movements
app.get('/api/movements', async (req, res) => {
    try {
      const result = await req.db.query(`
        SELECT
            m.movimiento_id,
            p.nombre AS product_name,
            m.cantidad,
            m.tipo_movimiento,
            ulo.codigo_ubicacion AS ubicacion_origen,
            uld.codigo_ubicacion AS ubicacion_destino,
            u.nombre_usuario AS usuario,
            m.fecha_movimiento,
            m.referencia_externa
        FROM
            movimientos m
        JOIN
            productos p ON m.producto_id = p.id -- Corregido: p.id
        LEFT JOIN
            ubicaciones ulo ON m.ubicacion_origen_id = ulo.ubicacion_id
        LEFT JOIN
            ubicaciones uld ON m.ubicacion_destino_id = uld.ubicacion_id
        JOIN
            usuarios_rf u ON m.usuario_id = u.usuario_id
        ORDER BY
            m.fecha_movimiento DESC;
      `.trim()); // Aplicar .trim()
    res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener movimientos:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});


// 4. ENDPOINTS PARA GESTIÓN DE UBICACIONES
// ========================================================================

// GET: Obtener todas las ubicaciones
// URL: http://localhost:3001/api/locations
app.get('/api/locations', async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM ubicaciones ORDER BY codigo_ubicacion ASC'.trim()); // Aplicar .trim()
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ubicaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST: Crear una nueva ubicación
// URL: http://localhost:3001/api/locations
// Cuerpo: { "codigo_ubicacion": "...", "descripcion": "...", "tipo": "...", "bodega": "...", "nivel": ... }
app.post('/api/locations', async (req, res) => {
  const { codigo_ubicacion, descripcion, tipo, bodega, nivel } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO ubicaciones (codigo_ubicacion, descripcion, tipo, bodega, nivel) VALUES ($1, $2, $3, $4, $5) RETURNING *'.trim(), // Aplicar .trim()
      [codigo_ubicacion, descripcion, tipo, bodega, nivel]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear ubicación:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PUT: Actualizar una ubicación existente
// URL: http://localhost:3001/api/locations/:id
// Cuerpo: { "codigo_ubicacion": "...", "descripcion": "...", "tipo": "...", "bodega": "...", "nivel": ... }
app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params; // id es ubicacion_id
  const { codigo_ubicacion, descripcion, tipo, bodega, nivel } = req.body;
  try {
    const result = await req.db.query(
      `UPDATE ubicaciones SET
        codigo_ubicacion = COALESCE($1, codigo_ubicacion),
        descripcion = COALESCE($2, descripcion),
        tipo = COALESCE($3, tipo),
        bodega = COALESCE($4, bodega),
        nivel = COALESCE($5, nivel)
      WHERE ubicacion_id = $6 RETURNING *`.trim(), // Aplicar .trim()
      [codigo_ubicacion, descripcion, tipo, bodega, nivel, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar ubicación:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// DELETE: Eliminar una ubicación
// URL: http://localhost:3001/api/locations/:id
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params; // id es ubicacion_id
  try {
    await req.db.query('BEGIN'); // Iniciar transacción
    // Primero, elimina registros de inventario relacionados para evitar errores de clave foránea
    await req.db.query('DELETE FROM inventario WHERE ubicacion_id = $1'.trim(), [id]); // Aplicar .trim()
    // Luego, elimina los movimientos relacionados con esta ubicación
    await req.db.query('DELETE FROM movimientos WHERE ubicacion_origen_id = $1 OR ubicacion_destino_id = $1'.trim(), [id]); // Aplicar .trim()

    const result = await req.db.query('DELETE FROM ubicaciones WHERE ubicacion_id = $1 RETURNING *'.trim(), [id]); // Aplicar .trim()
    if (result.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }
    await req.db.query('COMMIT');
    res.status(204).send(); // 204 No Content para eliminación exitosa
  } catch (err) {
    console.error('Error al eliminar ubicación:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// 5. ENDPOINTS PARA ESCÁNER QR
// ===================================================================

// GET: Obtener información del producto por código QR
// URL: http://localhost:3001/api/qr/product/:qrCode
app.get('/api/qr/product/:qrCode', async (req, res) => {
  const { qrCode } = req.params; // qrCode es el codigo_barra
  try {
    const productResult = await req.db.query(
      `SELECT
          p.id, -- Corregido: p.id
          p.nombre,
          p.descripcion,
          p.codigo_barra,
          p.unidad_medida,
          COALESCE(SUM(i.cantidad), 0) AS cantidad_total_en_inventario
      FROM
          productos p
      LEFT JOIN
          inventario i ON p.id = i.producto_id -- Corregido: p.id
      WHERE
          p.codigo_barra = $1
      GROUP BY
          p.id, p.nombre, p.descripcion, p.codigo_barra, p.unidad_medida;`.trim(), // Aplicar .trim()
      [qrCode]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado con ese código QR' });
    }

    const product = productResult.rows[0];

    // Obtener ubicaciones y cantidades específicas de este producto
    const locationsResult = await req.db.query(`
      SELECT
          i.ubicacion_id,
          u.codigo_ubicacion,
          u.descripcion,
          i.cantidad
      FROM
          inventario i
      JOIN
          ubicaciones u ON i.ubicacion_id = u.ubicacion_id
      WHERE
          i.producto_id = $1;`.trim(), // Aplicar .trim()
      [product.id]
    );

    product.ubicaciones_detalle = locationsResult.rows;

    res.json(product);
  } catch (err) {
    console.error('Error al obtener información del producto por QR:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// 6. ENDPOINTS PARA GESTIÓN DE USUARIOS
// ===================================================================

// GET: Obtener todos los usuarios
// URL: http://localhost:3001/api/users
app.get('/api/users', async (req, res) => {
    try {
        const result = await req.db.query('SELECT usuario_id, nombre_usuario, nombre_completo, rol, activo, fecha_creacion FROM usuarios_rf ORDER BY nombre_usuario ASC'.trim()); // Aplicar .trim()
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST: Crear un nuevo usuario
// URL: http://localhost:3001/api/users
// Cuerpo: { "nombre_usuario": "...", "nombre_completo": "...", "rol": "..." }
app.post('/api/users', async (req, res) => {
    const { nombre_usuario, nombre_completo, rol } = req.body;
    try {
        const result = await req.db.query(
            'INSERT INTO usuarios_rf (nombre_usuario, nombre_completo, rol) VALUES ($1, $2, $3) RETURNING usuario_id, nombre_usuario, nombre_completo, rol, activo, fecha_creacion'.trim(), // Aplicar .trim()
            [nombre_usuario, nombre_completo, rol]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

// PUT: Actualizar un usuario existente
// URL: http://localhost:3001/api/users/:id
// Cuerpo: { "nombre_usuario": "...", "nombre_completo": "...", "rol": "...", "activo": true/false }
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params; // id es usuario_id
    const { nombre_usuario, nombre_completo, rol, activo } = req.body;
    try {
        const result = await req.db.query(
            `UPDATE usuarios_rf SET
                nombre_usuario = COALESCE($1, nombre_usuario),
                nombre_completo = COALESCE($2, nombre_completo),
                rol = COALESCE($3, rol),
                activo = COALESCE($4, activo)
            WHERE usuario_id = $5 RETURNING usuario_id, nombre_usuario, nombre_completo, rol, activo, fecha_creacion`.trim(), // Aplicar .trim()
            [nombre_usuario, nombre_completo, rol, activo, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al actualizar usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

// DELETE: Eliminar un usuario
// URL: http://localhost:3001/api/users/:id
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params; // id es usuario_id
  try {
    await req.db.query('BEGIN'); // Iniciar transacción
    // Eliminar movimientos asociados a este usuario
    await req.db.query('DELETE FROM movimientos WHERE usuario_id = $1'.trim(), [id]); // Aplicar .trim()
    
    const result = await req.db.query('DELETE FROM usuarios_rf WHERE usuario_id = $1 RETURNING *'.trim(), [id]); // Aplicar .trim()
    if (result.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    await req.db.query('COMMIT');
    res.status(204).send(); // 204 No Content para eliminación exitosa
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// Iniciar el servidor backend
app.listen(BACKEND_PORT, () => {
  console.log(`🚀 Backend server listening on port ${BACKEND_PORT}`);
});

