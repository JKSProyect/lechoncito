let usuarioActivo = null;
let datos = {};

document.addEventListener("DOMContentLoaded", () => {
  const almacenados = localStorage.getItem("usuarios");
  if (almacenados) {
    datos = JSON.parse(almacenados);
  }
});

function guardarDatos() {
  localStorage.setItem("usuarios", JSON.stringify(datos));
}

function mostrarMensaje(texto, tipo = "info") {
  const mensaje = document.getElementById("mensaje");
  mensaje.innerText = texto;
  mensaje.style.color = tipo === "error" ? "red" : "green";
  mensaje.style.opacity = 1;
  setTimeout(() => mensaje.style.opacity = 0, 4000);
}

function toggleRegister(mostrarLogin) {
  document.getElementById("loginForm").style.display = mostrarLogin ? "block" : "none";
  document.getElementById("registerForm").style.display = mostrarLogin ? "none" : "block";
}

function register() {
  const user = document.getElementById("newUsername").value.trim();
  const pass = document.getElementById("newPassword").value.trim();

  if (!user || !pass) return mostrarMensaje("Usuario y contraseña requeridos", "error");
  if (datos[user]) return mostrarMensaje("El usuario ya existe", "error");

  datos[user] = { password: pass, saldo: 0, movimientos: [], metas: [] };
  guardarDatos();
  mostrarMensaje("Cuenta creada con éxito");
  toggleRegister(true);
  document.getElementById("newUsername").value = "";
  document.getElementById("newPassword").value = "";
}

function login() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (!datos[user] || datos[user].password !== pass) {
    return mostrarMensaje("Credenciales inválidas", "error");
  }

  usuarioActivo = user;
  document.getElementById("usuarioNombre").innerText = usuarioActivo;
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("appContent").style.display = "block";
  actualizarVista();

  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function logout() {
  usuarioActivo = null;
  document.getElementById("appContent").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
}

function ingresar() {
  const cantidad = parseFloat(document.getElementById("ingreso").value);
  const descripcion = document.getElementById("descIngreso").value || "Ingreso";

  if (isNaN(cantidad) || cantidad <= 0) return mostrarMensaje("Cantidad inválida", "error");

  const usuario = datos[usuarioActivo];
  usuario.saldo += cantidad;
  usuario.movimientos.push({
    tipo: "ingreso",
    cantidad,
    descripcion,
    fecha: new Date().toLocaleString()
  });

  avanzarMetas(cantidad);
  guardarDatos();
  actualizarVista();
  mostrarMensaje("Ingreso registrado");

  document.getElementById("ingreso").value = "";
  document.getElementById("descIngreso").value = "";
}

function sacar() {
  const cantidad = parseFloat(document.getElementById("retiro").value);
  const descripcion = document.getElementById("descripcionRetiro").value || "Retiro";

  if (isNaN(cantidad) || cantidad <= 0) return mostrarMensaje("Cantidad inválida", "error");

  const usuario = datos[usuarioActivo];
  if (cantidad > usuario.saldo) {
    return mostrarMensaje("Fondos insuficientes", "error");
  }

  usuario.saldo -= cantidad;
  usuario.movimientos.push({
    tipo: "retiro",
    cantidad,
    descripcion,
    fecha: new Date().toLocaleString()
  });

  guardarDatos();
  actualizarVista();

  if (cantidad > 0.5 * usuario.saldo) {
    mostrarMensaje("¡Estás retirando mucho dinero! Cuida tu ahorro.", "error");
  } else {
    mostrarMensaje("Retiro registrado");
  }

  document.getElementById("retiro").value = "";
  document.getElementById("descripcionRetiro").value = "";
}

function crearMeta() {
  const nombre = document.getElementById("nombreMeta").value.trim();
  const monto = parseFloat(document.getElementById("montoMeta").value);

  if (!nombre || isNaN(monto) || monto <= 0) {
    return mostrarMensaje("Nombre y monto válidos requeridos", "error");
  }

  const usuario = datos[usuarioActivo];
  usuario.metas.push({ nombre, objetivo: monto, actual: 0, completado: false });
  guardarDatos();
  actualizarVista();
  mostrarMensaje("Meta creada");

  document.getElementById("nombreMeta").value = "";
  document.getElementById("montoMeta").value = "";
}

function avanzarMetas(cantidad) {
  const usuario = datos[usuarioActivo];
  usuario.metas.forEach(meta => {
    if (!meta.completado) {
      meta.actual += cantidad;
      if (meta.actual >= meta.objetivo) {
        meta.completado = true;
        meta.actual = meta.objetivo;
        mostrarMensaje(`Felicidades! Has completado la meta "${meta.nombre}"`);
      }
    }
  });
}

function actualizarVista() {
  const usuario = datos[usuarioActivo];
  document.getElementById("saldo").innerText = usuario.saldo.toFixed(2);

  const movimientos = usuario.movimientos.map(m =>
    `<div class="movimiento ${m.tipo}">${m.fecha} - ${m.tipo.toUpperCase()}: $${m.cantidad.toFixed(2)} - ${m.descripcion}</div>`
  ).join("");
  document.getElementById("movimientos").innerHTML = movimientos;

  const metas = usuario.metas.map(meta => {
    const progreso = (meta.actual / meta.objetivo) * 100;
    return `
      <div class="meta">
        <strong>${meta.nombre}</strong> - $${meta.actual.toFixed(2)} / $${meta.objetivo.toFixed(2)}
        <div class="progress">
          <div class="progress-bar" style="width: ${progreso}%;"></div>
        </div>
      </div>`;
  }).join("");
  document.getElementById("listaMetas").innerHTML = metas;

  const informe = usuario.movimientos.filter(m => m.tipo === "retiro").map(m =>
    `<div>${m.fecha}: $${m.cantidad.toFixed(2)} en ${m.descripcion}</div>`
  ).join("");
  document.getElementById("informeGastos").innerHTML = informe;
}

let grafica = null;

function mostrarGraficaSaldo() {
  const usuario = datos[usuarioActivo];
  const labels = usuario.movimientos.map(m => m.fecha);
  const data = usuario.movimientos.map((_, i) => {
    return usuario.movimientos.slice(0, i + 1).reduce((acc, mov) =>
      mov.tipo === "ingreso" ? acc + mov.cantidad : acc - mov.cantidad, 0);
  });

  document.getElementById("graficaVentana").style.display = "block";

  const ctx = document.getElementById("graficaSaldo").getContext("2d");
  if (grafica) grafica.destroy();
  grafica = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Saldo",
        data,
        borderColor: "blue",
        backgroundColor: "lightblue",
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 10
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => {
              const m = usuario.movimientos[context.dataIndex];
              return `${m.tipo.toUpperCase()}: $${m.cantidad.toFixed(2)} (${m.descripcion})`;
            }
          }
        }
      }
    }
  });
}

function cerrarGrafica() {
  document.getElementById("graficaVentana").style.display = "none";
}