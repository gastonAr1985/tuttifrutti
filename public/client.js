const socket = io();
let roomId = '';
let letra = '';
let nombreJugador = '';
let miId = '';
let soyCreador = false;

// Guardar mi socket.id cuando conecto
socket.on('connect', () => {
  miId = socket.id;
});

function ingresar() {
  nombreJugador = document.getElementById('nombreJugador').value.trim();
  if (nombreJugador) {
    socket.emit('setNombre', nombreJugador);
    document.getElementById('inicio').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    socket.emit('listarSalas');
  }
}

function crearSala() {
  socket.emit('crearSala');
}

function unirseSala(id) {
  roomId = id;
  socket.emit('unirseSala', roomId);
}

function unirsePorCodigo() {
  const id = document.getElementById('codigoSala').value.trim();
  if (id) {
    unirseSala(id);
  }
}

// Mostrar lista de salas
socket.on('salasDisponibles', (salas) => {
  const contenedor = document.getElementById('listaSalas');
  contenedor.innerHTML = '';
  salas.forEach(sala => {
    const div = document.createElement('div');
    div.innerHTML = `
      <p><strong>Código:</strong> ${sala.roomId}</p>
      <p><strong>Jugadores:</strong> ${sala.jugadores.join(', ')}</p>
      <button onclick="unirseSala('${sala.roomId}')">Unirse</button>
      <hr>
    `;
    contenedor.appendChild(div);
  });
});

// Sala creada
socket.on('salaCreada', (id) => {
  roomId = id;
  soyCreador = true;
  document.getElementById('codigoSala').value = id;
  alert('Sala creada: ' + id);
  socket.emit('unirseSala', id); // auto-unirse
 // mostrarBotonIniciar();
  if (soyCreador) {
    // Mostrar botón iniciar juego
    document.getElementById('btnIniciarJuego').style.display = 'block';
  } else {
    document.getElementById('btnIniciarJuego').style.display = 'none';
  }
});


// Jugadores listos → empieza el juego
socket.on('jugadoresListos', (data) => {
  letra = data.letra;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('juego').style.display = 'block';
  document.getElementById('letra').textContent = letra;
  document.getElementById('formulario').style.display = 'block';
  document.getElementById('esperando').textContent = '';
  document.getElementById('iniciarBtn')?.remove(); // borrar botón iniciar si está
});

// Esperando jugadores
socket.on('esperandoJugadores', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('juego').style.display = 'block';
  document.getElementById('formulario').style.display = 'none';
  document.getElementById('esperando').textContent = 'Esperando más jugadores...';
});

// Enviar respuestas
document.getElementById('formulario').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const respuestas = {
    nombre: form.nombre.value,
    animal: form.animal.value,
    fruta: form.fruta.value,
    pais: form.pais.value
  };
  socket.emit('respuestas', { roomId, respuestas });
  document.getElementById('esperando').textContent = 'Esperando al resto de jugadores...';
});

// Mostrar resultados
socket.on('mostrarResultados', (resultado) => {
  const div = document.getElementById('resultado');

  // Si resultado viene del multi-jugador:
  if (resultado.resultado && resultado.totales) {
    const jugadores = Object.keys(resultado.resultado);
    let html = `<h3>Resultados:</h3>`;
    jugadores.forEach((id, i) => {
      html += `
        <p><strong>Jugador ${i + 1} (${id}):</strong> ${resultado.totales[id]} puntos</p>
        <ul>
          ${Object.entries(resultado.resultado[id]).map(([cat, val]) =>
            `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
        </ul>
      `;
    });
    div.innerHTML = html;
  } else {
    // Resultado para 2 jugadores
    div.innerHTML = `
      <h3>Resultados:</h3>
      <p><strong>Jugador 1:</strong> ${resultado.total1} puntos</p>
      <ul>
        ${Object.entries(resultado.jugador1).map(([cat, val]) =>
          `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
      </ul>
      <p><strong>Jugador 2:</strong> ${resultado.total2} puntos</p>
      <ul>
        ${Object.entries(resultado.jugador2).map(([cat, val]) =>
          `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
      </ul>
    `;
  }
});

socket.on('errorSala', (mensaje) => {
  alert(mensaje);
});




// Ejemplo (client.js)
socket.on('infoSala', (data) => {
  // data puede traer info de la sala, jugadores y quien es el creador
  document.getElementById('salaCodigo').textContent = data.codigoSala;

  // Actualizar lista de jugadores
  const lista = document.getElementById('listaJugadores');
  lista.innerHTML = '';
  data.jugadores.forEach(j => {
    const li = document.createElement('li');
    li.textContent = j.nombre;
    lista.appendChild(li);
  });

  // Mostrar botón solo si sos creador
  if(data.creadorId === socket.id){
    document.getElementById('iniciarBtn').style.display = 'inline-block';
  } else {
    document.getElementById('iniciarBtn').style.display = 'none';
  }

  // Mostrar sección sala actual
  document.getElementById('salaActual').style.display = 'block';
});




// Sala unida exitosamente
socket.on('salaUnida', ({ roomId: idSala, jugadores, creadorId }) => {
  roomId = idSala;
  soyCreador = (creadorId === socket.id);

  document.getElementById('menu').style.display = 'none';
  document.getElementById('salaActual').style.display = 'block';
  document.getElementById('salaCodigo').textContent = idSala;

  actualizarListaJugadores(jugadores);
console.log('socket.id', socket.id, 'creadorId', creadorId);
  if (soyCreador) {
  mostrarBotonIniciar();
}
});

// Actualizar jugadores cuando alguien se une
socket.on('actualizarJugadores', (jugadores) => {
  actualizarListaJugadores(jugadores);
});



function mostrarBotonIniciar() {
  if (soyCreador && !document.getElementById('iniciarBtn')) {
    const btn = document.createElement('button');
    btn.id = 'iniciarBtn';
    btn.innerText = 'Iniciar Juego';
    btn.onclick = () => {
      socket.emit('iniciarJuego', roomId);
    };
    document.getElementById('salaActual').appendChild(btn); // mejor en la sección de la sala
  }
}

// Utilidad para actualizar lista
function actualizarListaJugadores(jugadores) {
  const ul = document.getElementById('listaJugadores');
  ul.innerHTML = '';
  jugadores.forEach(j => {
    const li = document.createElement('li');
    li.textContent = j;
    ul.appendChild(li);
  });
}



