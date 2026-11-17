
// ======================================
// PLATAFORMA DE VENTAS INTELIGENTES
// AUTENTICACIÓN Y SESIONES
// ======================================

const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");
const accessSection = document.getElementById("acceso");
const dashboard = document.getElementById("dashboard");
const userInfo = document.getElementById("userInfo");
const logoutButton = document.getElementById("logoutButton");

// Mostrar u ocultar el panel

async function mostrarPanel(user) {
  if (!user) {
    dashboard.classList.add("hidden");
    accessSection.classList.remove("hidden");
    userInfo.textContent = "";
    return;
  }

  accessSection.classList.add("hidden");
  dashboard.classList.remove("hidden");

  userInfo.textContent = "Cargando empresa...";

  try {
    const { data, error } = await supabaseClient
      .from("company_members")
      .select(`
        role,
        companies (
          id,
          name
        )
      `)
      .eq("user_id", user.id);

    if (error) throw error;

    if (!data || data.length === 0) {
      userInfo.textContent =
        "Sesión iniciada: " + user.email +
        ". Todavía no tienes una empresa asignada.";
      return;
    }

    const membership = data[0];
    await cargarEmpresaProductos(user);
    userInfo.textContent =
      "Usuario: " + user.email +
      " | Empresa: " + membership.companies.name +
      " | Rol: " + membership.role;

  } catch (error) {
    console.error("Error al cargar empresa:", error);

    userInfo.textContent =
      "No se pudo cargar la empresa: " + error.message;
  }
}

// Mensajes
function mostrarMensaje(texto, error = false) {
  authMessage.textContent = texto;
  authMessage.style.color = error ? "#ff6b6b" : "#00D6A3";
}

// Iniciar sesión
loginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const submitButton = loginForm.querySelector("button");

  submitButton.disabled = true;
  mostrarMensaje("Verificando acceso...");

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    mostrarMensaje("¡Bienvenido!");
    mostrarPanel(data.user);

  } catch (error) {
    mostrarMensaje(
      error.message || "No fue posible iniciar sesión.",
      true
    );
  } finally {
    submitButton.disabled = false;
  }
});

// Cerrar sesión
logoutButton.addEventListener("click", async function() {
  logoutButton.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    mostrarPanel(null);
    mostrarMensaje("Sesión cerrada correctamente.");

  } catch (error) {
    alert("Error al cerrar sesión: " + error.message);
  } finally {
    logoutButton.disabled = false;
  }
});

// Recuperar sesión al cargar la aplicación
async function comprobarSesion() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    mostrarPanel(data.session?.user || null);

  } catch (error) {
    console.error("Error al comprobar sesión:", error);
  }
}

// Escuchar cambios de autenticación
supabaseClient.auth.onAuthStateChange(
  function(event, session) {
    mostrarPanel(session?.user || null);
  }
);

// Inicializar aplicación
comprobarSesion();

// ======================================
// INF3X - MÓDULO DE PRODUCTOS
// ======================================

let empresaActualId = null;
let puedeAdministrarProductos = false;

const productsPanel = document.getElementById("productsPanel");
const productForm = document.getElementById("productForm");
const productMessage = document.getElementById("productMessage");
const productsList = document.getElementById("productsList");

function mensajeProducto(texto, error = false) {
  productMessage.textContent = texto;
  productMessage.style.color = error ? "#ff6b6b" : "#00D6A3";
}

// Consultar empresa y permisos del usuario
async function cargarEmpresaProductos(user) {
  empresaActualId = null;
  puedeAdministrarProductos = false;
  productsPanel.classList.add("hidden");

  if (!user) return;

  const { data, error } = await supabaseClient
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"]);

  if (error) {
    console.error("Error de permisos:", error);
    return;
  }

  if (!data || data.length === 0) return;

  empresaActualId = data[0].company_id;
  puedeAdministrarProductos = true;

  productsPanel.classList.remove("hidden");

  await cargarProductos();
}

// Guardar producto
productForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!empresaActualId || !puedeAdministrarProductos) {
    mensajeProducto("No tienes permisos para registrar productos.", true);
    return;
  }

  const boton = productForm.querySelector('button[type="submit"]');

  const nombre = document.getElementById("productName").value.trim();
  const descripcion = document.getElementById("productDescription").value.trim();
  const sku = document.getElementById("productSku").value.trim();
  const precioTexto = document.getElementById("productPrice").value;
  const stockTexto = document.getElementById("productStock").value;
  const estado = document.getElementById("productStatus").value;

  const precio = Number(precioTexto);
  const stock = Number(stockTexto);

  if (
    !nombre ||
    precioTexto === "" ||
    stockTexto === "" ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    !Number.isSafeInteger(stock) ||
    stock < 0 ||
    !["draft", "active"].includes(estado)
  ) {
    mensajeProducto("Revisa los datos del producto.", true);
    return;
  }

  boton.disabled = true;
  mensajeProducto("Guardando producto...");

  try {
    const { error } = await supabaseClient
      .from("products")
      .insert({
        company_id: empresaActualId,
        name: nombre,
        description: descripcion || null,
        sku: sku || null,
        price: precio,
        stock: stock,
        status: estado
      });

    if (error) throw error;

    productForm.reset();
    mensajeProducto("Producto registrado correctamente.");

    await cargarProductos();

  } catch (error) {
    console.error("Error al guardar:", error);
    mensajeProducto("Error: " + error.message, true);
  } finally {
    boton.disabled = false;
  }
});

// Consultar productos de la empresa
async function cargarProductos() {
  if (!empresaActualId || !puedeAdministrarProductos) return;

  productsList.textContent = "Cargando productos...";

  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, description, sku, price, stock, status")
    .eq("company_id", empresaActualId)
    .order("created_at", { ascending: false });

  if (error) {
    productsList.textContent = "Error: " + error.message;
    return;
  }

  productsList.replaceChildren();

  if (!data || data.length === 0) {
    productsList.textContent = "Todavía no hay productos registrados.";
    return;
  }

  const formatoPrecio = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  });

  data.forEach(function(producto) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "product-card";

    const titulo = document.createElement("h4");
    titulo.textContent = producto.name;

    const descripcion = document.createElement("p");
    descripcion.textContent = producto.description || "Sin descripción";

    const precio = document.createElement("p");
    precio.className = "product-price";
    precio.textContent = formatoPrecio.format(producto.price);

    const existencias = document.createElement("p");
    existencias.textContent = "Existencias: " + producto.stock;

    const estado = document.createElement("p");
    estado.textContent =
      "Estado: " +
      (producto.status === "active" ? "Publicado" : "Borrador");

    tarjeta.append(
      titulo,
      descripcion,
      precio,
      existencias,
      estado
    );

    productsList.appendChild(tarjeta);
  });
}
