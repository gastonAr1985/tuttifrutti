const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = 3000;

app.use(express.static('public'));

let rooms = {};

// Opcional: límite máximo de jugadores por sala (cambia a null para ilimitado)
const MAX_JUGADORES_POR_SALA = 4 ; // o pon 4, 2, etc.

io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado:', socket.id);

  socket.on('crearSala', () => {
    const roomId = generarId();
    rooms[roomId] = {
      jugadores: [],
      creador: socket.id,
      respuestas: {},
      letra: letraAleatoria(),
      jugando: false
    };
    socket.emit('salaCreada', roomId);
  });

  socket.on('setNombre', (nombre) => {
    socket.nombre = nombre;
  });

  socket.on('unirseSala', (roomId) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('errorSala', 'Sala no encontrada');

    // Revisar límite si está activado
    if (MAX_JUGADORES_POR_SALA && room.jugadores.length >= MAX_JUGADORES_POR_SALA) {
      return socket.emit('errorSala', 'Sala llena');
    }

    if (!room.jugadores.includes(socket.id)) {
      room.jugadores.push(socket.id);
      socket.join(roomId);
      console.log(`Jugador ${socket.id} se unió a la sala ${roomId}`);
      console.log('ROOM:', room);
      console.log(`ESTADO JUGANDO ${room.jugando} `);
    
    
      if (room.jugando) {
        socket.emit('jugadoresListos', { letra: room.letra });
      }
    }

    const nombresJugadores = room.jugadores.map(id =>
      io.sockets.sockets.get(id)?.nombre || 'Sin nombre'
    );

    // Avisar a todos en la sala la lista actualizada
    io.to(roomId).emit('actualizarJugadores', nombresJugadores);

    // Además, avisar al jugador que se unió con datos sala y creador
    socket.emit('salaUnida', { roomId, jugadores: nombresJugadores, creadorId: room.creador });
  });

  socket.on('iniciarJuego', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.creador !== socket.id) {
      socket.emit('errorSala', 'Solo el creador puede iniciar el juego');
      return;
    }

    const letra = letraAleatoria();
     room.letra = letra;
     room.jugando = true; // ahora el juego está en curso
     io.to(roomId).emit('jugadoresListos', { letra: room.letra }); // mostrar grilla a todos
  });

  socket.on('respuestas', ({ roomId, respuestas }) => {

    

    const room = rooms[roomId];
    if (!room) return;

    room.respuestas[socket.id] = respuestas;

    if (Object.keys(room.respuestas).length === room.jugadores.length) {
      // const resultado = compararRespuestasMulti(room.jugadores, room.respuestas, room.letra);
      // io.to(roomId).emit('mostrarResultados', resultado);


      const resultado = compararRespuestasMulti(room.jugadores, room.respuestas, room.letra);

      // Crear mapa de id a nombre
      const nombresJugadores = {};
      room.jugadores.forEach(id => {
        nombresJugadores[id] = io.sockets.sockets.get(id)?.nombre || 'Sin nombre';
      });

      io.to(roomId).emit('mostrarResultados', {
        ...resultado,
        nombresJugadores
      });
      // Reiniciar para próxima ronda
      
    }
  });

  socket.on('listarSalas', () => {
    const resumenSalas = Object.entries(rooms).map(([id, data]) => ({
      roomId: id,
      jugadores: data.jugadores.map((socketId) =>
        io.sockets.sockets.get(socketId)?.nombre || 'Desconocido'),
      cantidad: data.jugadores.length
    }));
    socket.emit('salasDisponibles', resumenSalas);
  });

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} desconectado`);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.jugadores.indexOf(socket.id);

      if (index !== -1) {
        room.jugadores.splice(index, 1);
        delete room.respuestas[socket.id];
        console.log(`Jugador ${socket.id} fue removido de la sala ${roomId}`);

        if (room.jugadores.length === 0) {
          delete rooms[roomId];
          console.log(`Sala ${roomId} eliminada por estar vacía`);
        } else {
          const nombres = room.jugadores.map(id =>
            io.sockets.sockets.get(id)?.nombre || 'Sin nombre');
          io.to(roomId).emit('actualizarJugadores', nombres);
        }
      }
    }
  });
});

// Funciones auxiliares

function generarId() {
  return Math.random().toString(36).substring(2, 8);
}

function letraAleatoria() {
  const letras = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  return letras[Math.floor(Math.random() * letras.length)];
}

function compararRespuestasMulti(jugadores, respuestas, letra) {
  const categorias = ["nombre", "animal", "fruta", "pais"];
  const resultado = {};
  const totales = {};

  for (const id of jugadores) {
    resultado[id] = {};
    totales[id] = 0;
  }

  for (const categoria of categorias) {
    const respuestasCategoria = {};

    for (const id of jugadores) {
      const valor = (respuestas[id][categoria] || "").trim();
      const valorNormalizado = valor.toLowerCase();

      if (!respuestasCategoria[valorNormalizado]) {
        respuestasCategoria[valorNormalizado] = [];
      }

      respuestasCategoria[valorNormalizado].push(id);
    }

    for (const valor in respuestasCategoria) {
      const ids = respuestasCategoria[valor];

      for (const id of ids) {
        const original = respuestas[id][categoria] || "";
        const empiezaBien = original.toUpperCase().startsWith(letra);
        let puntos = 0;

        if (empiezaBien) {
          puntos = ids.length === 1 ? 10 : 5;
        }

        resultado[id][categoria] = { valor: original, puntos };
        totales[id] += puntos;
      }
    }
  }

  return { resultado, totales };
}

http.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
