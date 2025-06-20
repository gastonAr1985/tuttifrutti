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
  
});


// Jugadores listos → empieza el juego
socket.on('jugadoresListos', (data) => {
  letra = data.letra;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('juego').style.display = 'block';
  document.getElementById('letra').textContent = letra;
  // document.getElementById('formulario').style.display = 'block';
  iniciarCuentaRegresiva();
  document.getElementById('esperando').textContent = '';
  // document.getElementById('iniciarBtn')?.remove(); // borrar botón iniciar si está
   const btn = document.getElementById('iniciarBtn');
  // if (btn) btn.style.display = 'none';
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
  form.reset(); 
  document.getElementById('esperando').textContent = 'Esperando al resto de jugadores...';
});

// Mostrar resultados
// socket.on('mostrarResultados', (resultado) => {
//   const div = document.getElementById('resultado');

//   // Si resultado viene del multi-jugador:
//   if (resultado.resultado && resultado.totales) {
//     const jugadores = Object.keys(resultado.resultado);
//     let html = `<h3>Resultados:</h3>`;
//     jugadores.forEach((id, i) => {
//       html += `
//         <p><strong>Jugador ${i + 1} (${id}):</strong> ${resultado.totales[id]} puntos</p>
//         <ul>
//           ${Object.entries(resultado.resultado[id]).map(([cat, val]) =>
//             `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
//         </ul>
//       `;
//     });
//     div.innerHTML = html;
//   } else {
//     // Resultado para 2 jugadores
//     div.innerHTML = `
//       <h3>Resultados:</h3>
//       <p><strong>Jugador 1:</strong> ${resultado.total1} puntos</p>
//       <ul>
//         ${Object.entries(resultado.jugador1).map(([cat, val]) =>
//           `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
//       </ul>
//       <p><strong>Jugador 2:</strong> ${resultado.total2} puntos</p>
//       <ul>
//         ${Object.entries(resultado.jugador2).map(([cat, val]) =>
//           `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
//       </ul>
//     `;
//   }


//   document.getElementById('juego').style.display = 'none';
//   document.getElementById('salaActual').style.display = 'block';


//   if (soyCreador) {
//     console.log('¿Soy el creador?', soyCreador);
//     console.log('Llamando a mostrarBotonIniciar()');
//     mostrarBotonIniciar('Nueva Ronda');
//   }
// });


socket.on('mostrarResultados', (resultado) => {
  const div = document.getElementById('resultado');
  const nombres = resultado.nombresJugadores || {};

  if (resultado.resultado && resultado.totales) {
    const jugadores = Object.keys(resultado.resultado);
    let html = `<h3>Resultados:</h3>`;
    jugadores.forEach((id, i) => {
      const nombreJugador = nombres[id] || `Jugador ${i + 1}`;
      html += `
        <p><strong>${nombreJugador} (${id}):</strong> ${resultado.totales[id]} puntos</p>
        <ul>
          ${Object.entries(resultado.resultado[id]).map(([cat, val]) =>
            `<li>${cat}: ${val.valor} (${val.puntos} pts)</li>`).join('')}
        </ul>
      `;
    });
    div.innerHTML = html;
  } else {
    // Adaptar también si usás esa otra forma de resultado para 2 jugadores (si aplica)
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

  document.getElementById('juego').style.display = 'none';
  document.getElementById('salaActual').style.display = 'block';

  if (soyCreador) {
    mostrarBotonIniciar('Nueva Ronda');
  }
});


socket.on('errorSala', (mensaje) => {
  alert(mensaje);
});


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





function mostrarBotonIniciar(texto = 'Iniciar Juego') {
  console.log('mostrarBotonIniciar llamado con texto:', texto);

  const container = document.getElementById('botonIniciarContainer');
  if (!container) {
    console.warn('No se encontró el contenedor #botonIniciarContainer');
    return;
  }

  let btn = document.getElementById('iniciarBtn');

  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'iniciarBtn';
    btn.onclick = () => {
      console.log('Se hizo clic en iniciar juego');
      socket.emit('iniciarJuego', roomId);
    };
    container.appendChild(btn);
  }

  btn.innerText = texto;

  // 🔥 FORZAR VISIBILIDAD
  btn.style.removeProperty('display');
  btn.style.display = 'inline-block';
  btn.style.visibility = 'visible';
  btn.style.opacity = '1';

  Object.assign(btn.style, {
    marginTop: '10px',
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  });
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

function iniciarCuentaRegresiva(callback) {
  const cuentaDiv = document.getElementById('cuentaRegresiva');
  const formulario = document.getElementById('formulario');
  let segundos = 3;

  formulario.style.display = 'none';
  cuentaDiv.style.display = 'block';
  cuentaDiv.textContent = segundos;

  const intervalo = setInterval(() => {
    segundos--;
    if (segundos > 0) {
      cuentaDiv.textContent = segundos;
    } else {
      clearInterval(intervalo);
      cuentaDiv.textContent = '¡YA!';
      setTimeout(() => {
        cuentaDiv.textContent = '';
        cuentaDiv.style.display = 'none';
        formulario.style.display = 'block';
        if (callback) callback();
      }, 1000);
    }
  }, 1000);
}



