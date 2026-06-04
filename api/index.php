<?php
// =============================================================================
// api/index.php  –  VET ECL · API REST → MongoDB
// Requiere: composer require mongodb/mongodb
// =============================================================================

require_once __DIR__ . '/../vendor/autoload.php';

// ── Cabeceras CORS + JSON ─────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Conexión a MongoDB ────────────────────────────────────────────────────────
// Cambia la URI si usas usuario/contraseña:
// mongodb://usuario:contraseña@localhost:27017
$uri    = 'mongodb+srv://veterinario:67916791MCxxx@cluster0.ni02wb4.mongodb.net/?appName=Cluster0';
$client = new MongoDB\Client($uri);
$db     = $client->selectDatabase('veterinaria');

// ── Colecciones disponibles ───────────────────────────────────────────────────
$colecciones = [
    'clientes'      => $db->clientes,
    'veterinarios'  => $db->veterinarios,
    'mascotas'      => $db->mascotas,
    'citas'         => $db->citas,
    'tratamientos'  => $db->tratamientos,
    'facturas'      => $db->facturas,
];

// ── Router ────────────────────────────────────────────────────────────────────
// Ejemplos de rutas:
//   GET  /api/index.php?col=clientes          → lista todos
//   GET  /api/index.php?col=clientes&id=xxx   → busca por campo *Id o _id
//   POST /api/index.php?col=clientes          → inserta documento (body JSON)

$method = $_SERVER['REQUEST_METHOD'];
$col    = $_GET['col'] ?? null;
$id     = $_GET['id']  ?? null;

// Validar colección
if (!$col || !array_key_exists($col, $colecciones)) {
    http_response_code(400);
    echo json_encode(['error' => 'Colección no válida. Usa: ' . implode(', ', array_keys($colecciones))]);
    exit;
}

$coleccion = $colecciones[$col];

try {

    // ── GET ───────────────────────────────────────────────────────────────────
    if ($method === 'GET') {

        if ($id) {
            // Buscar por el campo ID semántico del documento (ej. clienteId, idMascota…)
            // Se prueba primero el campo semántico, luego _id de Mongo
            $campoId = idField($col);
            $doc = $coleccion->findOne([$campoId => $id]);

            if (!$doc) {
                // Intentar con _id como ObjectId si el string luce como uno
                if (MongoDB\BSON\ObjectId::isValid($id)) {
                    $doc = $coleccion->findOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
                }
            }

            if ($doc) {
                echo json_encode(bsonToArray($doc));
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Documento no encontrado']);
            }

        } else {
            // Listar todos (máx. 100 por seguridad)
            $cursor = $coleccion->find([], ['limit' => 100]);
            $docs   = [];
            foreach ($cursor as $doc) {
                $docs[] = bsonToArray($doc);
            }
            echo json_encode($docs);
        }

    // ── POST ──────────────────────────────────────────────────────────────────
    } elseif ($method === 'POST') {

        $body = file_get_contents('php://input');
        $data = json_decode($body, true);

        if (!$data || !is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Body JSON inválido o vacío']);
            exit;
        }

        $result = $coleccion->insertOne($data);

        http_response_code(201);
        echo json_encode([
            'ok'           => true,
            'insertedId'   => (string) $result->getInsertedId(),
            'coleccion'    => $col,
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
    }

} catch (MongoDB\Driver\Exception\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error MongoDB: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error servidor: ' . $e->getMessage()]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Devuelve el nombre del campo ID semántico según la colección.
 * Mapeo basado en el esquema real de loader.js
 */
function idField(string $col): string {
    return match ($col) {
        'clientes'     => 'clienteId',
        'veterinarios' => 'veterinarioId',
        'mascotas'     => 'idMascota',
        'citas'        => 'idCita',
        'tratamientos' => 'idTratamiento',
        'facturas'     => 'folio',
        default        => '_id',
    };
}

/**
 * Convierte un documento BSON a array PHP serializable.
 * Convierte ObjectId a string para poder enviarlo como JSON.
 */
function bsonToArray($doc): array {
    $arr = (array) $doc;

    // Convertir _id (ObjectId) a string
    if (isset($arr['_id']) && $arr['_id'] instanceof MongoDB\BSON\ObjectId) {
        $arr['_id'] = (string) $arr['_id'];
    }

    // Convertir sub-documentos BSON (ej. vacunas)
    foreach ($arr as $key => $val) {
        if ($val instanceof MongoDB\BSON\Document || $val instanceof MongoDB\Model\BSONDocument) {
            $arr[$key] = iterator_to_array($val);
        }
        if ($val instanceof MongoDB\Model\BSONArray) {
            $arr[$key] = $val->getArrayCopy();
        }
    }

    return $arr;
}
