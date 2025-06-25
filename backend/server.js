// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

const BACKEND_PORT = process.env.BACKEND_PORT || 3001;

app.use((req, res, next) => {
  req.db = pool;
  next();
});

// --- Rutas de la API para la gestión de inventario y dashboard ---

// 1. ENDPOINTS PARA EL DASHBOARD
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalProductsResult = await req.db.query('SELECT COUNT(*) FROM productos'.trim());
    const totalValuedStockResult = await req.db.query('SELECT COALESCE(SUM(p.stock * p.valor_unitario), 0) AS total_valor FROM productos p;'.trim());
    const lowStockResult = await req.db.query('SELECT COUNT(*) FROM productos WHERE stock <= min_stock;'.trim());
    const today = new Date().toISOString().split('T')[0];
    const movementsTodayResult = await req.db.query('SELECT COUNT(*) FROM movimientos WHERE DATE(fecha_movimiento) = $1'.trim(), [today]);

    res.json({
      totalProducts: parseInt(totalProductsResult.rows[0].count || '0'),
      totalValuedStock: parseFloat(totalValuedStockResult.rows[0].total_valor || '0'),
      lowStockItems: parseInt(lowStockResult.rows[0].count || '0'),
      movementsToday: parseInt(movementsTodayResult.rows[0].count || '0')
    });
  } catch (err) {
    console.error('Error al obtener estadísticas del dashboard:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

app.get('/api/dashboard/recent-activity', async (req, res) => {
  try {
    // <<< CORRECCIÓN CLAVE AQUÍ: Cambiado 'm.ubicacion_destino_id' a 'mi.ubicacion_destino_id' >>>
    const result = await req.db.query(`SELECT mi.movimiento_id AS id, p.nombre AS product_name, mi.tipo_movimiento AS type, mi.cantidad AS quantity, TO_CHAR(mi.fecha_movimiento, 'HH24:MI AM') AS time, ulo.codigo_ubicacion AS ubicacion_origen_codigo, uld.codigo_ubicacion AS ubicacion_destino_codigo FROM movimientos mi JOIN productos p ON mi.producto_id = p.id LEFT JOIN ubicaciones ulo ON mi.ubicacion_origen_id = ulo.ubicacion_id LEFT JOIN ubicaciones uld ON mi.ubicacion_destino_id = uld.ubicacion_id JOIN usuarios_rf u ON mi.usuario_id = u.usuario_id ORDER BY mi.fecha_movimiento DESC LIMIT 5`.trim());
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener actividad reciente:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

app.get('/api/products/low-stock', async (req, res) => {
    try {
        const result = await req.db.query(`SELECT p.id, p.nombre AS product_name, p.stock AS current_stock, p.min_stock, p.codigo_barra FROM productos p WHERE p.stock <= p.min_stock ORDER BY p.stock ASC;`.trim());
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener alertas de stock bajo:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});


// 2. ENDPOINTS PARA LA GESTIÓN DE PRODUCTOS (INVENTARIO)
app.get('/api/items', async (req, res) => {
  try {
    const result = await req.db.query(`SELECT p.id, p.nombre, p.descripcion, p.codigo_barra, p.unidad_medida, p.fecha_creacion, p.stock, p.min_stock, p.categoria, p.valor_unitario AS precio, p.ubicacion_principal FROM productos p ORDER BY p.nombre ASC`.trim());
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener los items:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.db.query('SELECT * FROM productos WHERE id = $1'.trim(), [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener el producto por ID:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/items', async (req, res) => {
  const { nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario, categoria, ubicacion_principal } = req.body; 

  try {
    const productResult = await req.db.query(
      `INSERT INTO productos (nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario, categoria, ubicacion_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario AS precio, categoria, ubicacion_principal`.trim(),
      [nombre, descripcion, codigo_barra, stock, min_stock, valor_unitario, categoria, ubicacion_principal]
    );
    const newProduct = productResult.rows[0];
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Error al crear el item:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// <<< MODIFICACIÓN CLAVE EN PUT /api/items/:id >>>
// Esta ruta ahora construirá la consulta UPDATE dinámicamente
// para manejar la actualización de 'stock' u otros campos de forma flexible.
app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // Recibir el objeto completo con los campos a actualizar

  let updateFields = [];
  let updateValues = [];
  let paramCounter = 1;

  // Recorrer el cuerpo de la solicitud para construir dinámicamente el SET de la consulta
  for (const key in updates) {
    if (updates.hasOwnProperty(key)) {
      // Mapear el nombre del campo del frontend al nombre de la columna en la DB si son diferentes
      let dbColumn = key;
      switch (key) {
        case 'stock': dbColumn = 'stock'; break; // Ya coincide
        case 'name': dbColumn = 'nombre'; break; // Si permites actualizar nombre
        case 'description': dbColumn = 'descripcion'; break; // Si permites actualizar descripción
        case 'code': dbColumn = 'codigo_barra'; break; // Si permites actualizar codigo_barra
        case 'value': dbColumn = 'valor_unitario'; break; // Si permites actualizar valor_unitario
        case 'category': dbColumn = 'categoria'; break; // Si permites actualizar categoria
        case 'minStock': dbColumn = 'min_stock'; break; // Si permites actualizar min_stock
        case 'location': dbColumn = 'ubicacion_principal'; break; // Si permites actualizar ubicacion_principal
        case 'supplier': dbColumn = 'proveedor'; break; // Si permites actualizar proveedor
        case 'unidad_medida': dbColumn = 'unidad_medida'; break; // Si permites actualizar unidad_medida
        // Añade más casos si tu frontend envía otros nombres de campos para actualizar.
        default: break; // Si no hay mapeo especial, el nombre del key es el nombre de la columna
      }

      // Evitar que el 'id' se actualice a través del body
      if (dbColumn === 'id') continue; 
      
      updateFields.push(`${dbColumn} = $${paramCounter}`);
      updateValues.push(updates[key]);
      paramCounter++;
    }
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar.' });
  }

  updateValues.push(id); // El ID de la fila a actualizar es siempre el último parámetro

  try {
    const result = await req.db.query(
      `UPDATE productos SET ${updateFields.join(', ')} WHERE id = $${paramCounter} RETURNING *`.trim(),
      updateValues
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
// <<< FIN DE MODIFICACIÓN CLAVE EN PUT /api/items/:id >>>

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.query('BEGIN');
    await req.db.query('DELETE FROM inventario WHERE producto_id = $1'.trim(), [id]);
    await req.db.query('DELETE FROM movimientos WHERE producto_id = $1'.trim(), [id]);

    const result = await req.db.query('DELETE FROM productos WHERE id = $1 RETURNING *'.trim(), [id]);
    if (result.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await req.db.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// 3. ENDPOINTS PARA GESTIÓN DE MOVIMIENTOS
app.post('/api/movements', async (req, res) => {
  const { producto_id, cantidad, tipo_movimiento, ubicacion_origen_id, ubicacion_destino_id, usuario_id, referencia_externa } = req.body;
  const fecha_movimiento = new Date();

  try {
    await req.db.query('BEGIN');
    const movementResult = await req.db.query(
      `INSERT INTO movimientos (producto_id, cantidad, tipo_movimiento, ubicacion_origen_id, ubicacion_destino_id, usuario_id, fecha_movimiento, referencia_externa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`.trim(),
      [producto_id, cantidad, tipo_movimiento, ubicacion_origen_id, ubicacion_destino_id, usuario_id, fecha_movimiento, referencia_externa]
    );

    if (tipo_movimiento === 'ENTRADA') {
      await req.db.query(
        `INSERT INTO inventario (producto_id, ubicacion_id, cantidad)
         VALUES ($1, $2, $3)
         ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad = inventario.cantidad + EXCLUDED.cantidad, fecha_actualizacion = CURRENT_TIMESTAMP`.trim(),
        [producto_id, ubicacion_destino_id, cantidad]
      );
    } else if (tipo_movimiento === 'SALIDA') {
      await req.db.query(
        `UPDATE inventario SET cantidad = cantidad - $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE producto_id = $2 AND ubicacion_id = $3`.trim(),
        [cantidad, producto_id, ubicacion_origen_id]
      );
    } else if (tipo_movimiento === 'TRASLADO') {
      await req.db.query(
        `UPDATE inventario SET cantidad = cantidad - $1, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE producto_id = $2 AND ubicacion_id = $3`.trim(),
        [cantidad, producto_id, ubicacion_origen_id]
      );
      await req.db.query(
        `INSERT INTO inventario (producto_id, ubicacion_id, cantidad)
         VALUES ($1, $2, $3)
         ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad = inventario.cantidad + EXCLUDED.cantidad, fecha_actualizacion = CURRENT_TIMESTAMP`.trim(),
        [producto_id, ubicacion_destino_id, cantidad]
      );
    }

    await req.db.query('COMMIT');
    res.status(201).json(movementResult.rows[0]);
  } catch (err) {
    await req.db.query('ROLLBACK');
    console.error('Error al registrar movimiento o actualizar stock:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

app.get('/api/movements', async (req, res) => {
    try {
      const result = await req.db.query(`SELECT m.movimiento_id AS id, p.nombre AS product_name, m.cantidad, m.tipo_movimiento, ulo.codigo_ubicacion AS ubicacion_origen, uld.codigo_ubicacion AS ubicacion_destino, u.nombre_usuario AS usuario, m.fecha_movimiento, m.referencia_externa FROM movimientos m JOIN productos p ON m.producto_id = p.id LEFT JOIN ubicaciones ulo ON m.ubicacion_origen_id = ulo.ubicacion_id LEFT JOIN ubicaciones uld ON m.ubicacion_destino_id = uld.ubicacion_id JOIN usuarios_rf u ON m.usuario_id = u.usuario_id ORDER BY m.fecha_movimiento DESC;`.trim());
      res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener movimientos:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

// 4. ENDPOINTS PARA GESTIÓN DE UBICACIONES
app.get('/api/locations', async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM ubicaciones ORDER BY codigo_ubicacion ASC'.trim());
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ubicaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/locations', async (req, res) => {
  const { codigo_ubicacion, descripcion, tipo, bodega, nivel } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO ubicaciones (codigo_ubicacion, descripcion, tipo, bodega, nivel) VALUES ($1, $2, $3, $4, $5) RETURNING *'.trim(),
      [codigo_ubicacion, descripcion, tipo, bodega, nivel]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear ubicación:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo_ubicacion, descripcion, tipo, bodega, nivel } = req.body;
  try {
    const result = await req.db.query(
      `UPDATE ubicaciones SET
        codigo_ubicacion = COALESCE($1, codigo_ubicacion),
        descripcion = COALESCE($2, descripcion),
        tipo = COALESCE($3, tipo),
        bodega = COALESCE($4, bodega),
        nivel = COALESCE($5, nivel)
      WHERE ubicacion_id = $6 RETURNING *`.trim(),
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

app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.query('BEGIN');
    await req.db.query('DELETE FROM inventario WHERE ubicacion_id = $1'.trim(), [id]);
    await req.db.query('DELETE FROM movimientos WHERE ubicacion_origen_id = $1 OR ubicacion_destino_id = $1'.trim(), [id]);

    const result = await req.db.query('DELETE FROM ubicaciones WHERE ubicacion_id = $1 RETURNING *'.trim(), [id]);
    if (result.rows.length === 0) {
      await req.db.query('ROLLBACK');
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }
    await req.db.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar ubicación:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});


// 5. ENDPOINTS PARA ESCÁNER QR
app.get('/api/qr/product/:qrCode', async (req, res) => {
  const { qrCode } = req.params;
  try {
    const productResult = await req.db.query(
      `SELECT
          p.id,
          p.nombre,
          p.descripcion,
          p.codigo_barra,
          p.unidad_medida,
          COALESCE(SUM(i.cantidad), 0) AS cantidad_total_en_inventario
        FROM
          productos p
        LEFT JOIN
          inventario i ON p.id = i.producto_id
        WHERE
          p.codigo_barra = $1
        GROUP BY
          p.id, p.nombre, p.descripcion, p.codigo_barra, p.unidad_medida;`.trim(),
      [qrCode]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado con ese código QR' });
    }

    const product = productResult.rows[0];

    const locationsResult = await req.db.query(`SELECT
          i.ubicacion_id,
          u.codigo_ubicacion,
          u.descripcion,
          i.cantidad
        FROM
          inventario i
        JOIN
          ubicaciones u ON i.ubicacion_id = u.ubicacion_id
        WHERE
          i.producto_id = $1;`.trim(),
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
app.get('/api/users', async (req, res) => {
    try {
        const result = await req.db.query('SELECT usuario_id, nombre_usuario, nombre_completo, rol, activo, fecha_creacion FROM usuarios_rf ORDER BY nombre_usuario ASC'.trim());
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/users', async (req, res) => {
    const { nombre_usuario, nombre_completo, rol } = req.body;
    try {
        const result = await req.db.query(
            'INSERT INTO usuarios_rf (nombre_usuario, nombre_completo, rol) VALUES ($1, $2, $3) RETURNING usuario_id, nombre_usuario, nombre_completo, rol, activo, fecha_creacion'.trim(),
            [nombre_usuario, nombre_completo, rol]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_usuario, nombre_completo, rol, activo } = req.body;
    try {
        const result = await req.db.query(
            `UPDATE usuarios_rf SET
                nombre_usuario = COALESCE($1, nombre_usuario),
                nombre_completo = COALESCE($2, nombre_completo),
                rol = COALESCE($3, rol),
                activo = COALESCE($4, activo)
            WHERE usuario_id = $5 RETURNING usuario_id, nombre_usuario, nombre_completo, rol, activo, fecha_creacion`.trim(),
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

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await req.db.query('BEGIN');
        await req.db.query('DELETE FROM movimientos WHERE usuario_id = $1'.trim(), [id]);

        const result = await req.db.query('DELETE FROM usuarios_rf WHERE usuario_id = $1 RETURNING *'.trim(), [id]);
        if (result.rows.length === 0) {
            await req.db.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        await req.db.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

app.listen(BACKEND_PORT, () => {
  console.log(`🚀 Backend server listening on port ${BACKEND_PORT}`);
});