
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

    empresaActualId = null;
    puedeAdministrarProductos = false;

    productsPanel.classList.add("hidden");

    // Limpiar cualquier edición pendiente
    cancelarEdicionProducto();

    // Limpiar información de productos anteriores
    productsList.replaceChildren();

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

console.log(
  "INF3X - Fotografías seleccionadas:",
  imagenesSeleccionadas.length
);

if (productImagesInput.files.length > 0 &&
    imagenesSeleccionadas.length === 0) {
  mensajeProducto(
    "Las fotografías no están preparadas para subir. Selecciónalas nuevamente.",
    true
  );
  return;
}

  boton.disabled = true;
  mensajeProducto("Guardando producto...");

  try {
    
const datosProducto = {
  name: nombre,
  description: descripcion || null,
  sku: sku || null,
  price: precio,
  stock: stock,
  status: estado
};

let resultado;

if (productoEditandoId) {
  resultado = await supabaseClient
    .from("products")
    .update(datosProducto)
    .eq("id", productoEditandoId)
    .eq("company_id", empresaActualId)
    .select("id")
    .single();
} else {
  resultado = await supabaseClient
    .from("products")
    .insert({
      ...datosProducto,
      company_id: empresaActualId
    })
    .select("id")
    .single();
}


const { data: productoGuardado, error } = resultado;

if (error) throw error;

// Subir fotografías seleccionadas
if (imagenesSeleccionadas.length > 0) {
  const productoId = productoGuardado.id;

  // Consultar las fotografías existentes
  const { data: productoActual, error: consultaError } =
    await supabaseClient
      .from("products")
      .select("image_urls")
      .eq("id", productoId)
      .eq("company_id", empresaActualId)
      .single();

  if (consultaError) throw consultaError;

  const imagenesExistentes =
    productoActual.image_urls || [];

  if (
    imagenesExistentes.length +
    imagenesSeleccionadas.length > MAX_PRODUCT_IMAGES
  ) {
    throw new Error(
      "El producto puede tener máximo 5 fotografías en total."
    );
  }

  mensajeProducto("Subiendo fotografías...");

  const nuevasRutas =
    await subirFotografiasProducto(productoId);

  const todasLasImagenes = [
    ...imagenesExistentes,
    ...nuevasRutas
  ];

  const { data: productoActualizado, error: imagenError } =
    await supabaseClient
      .from("products")
      .update({
        image_urls: todasLasImagenes
      })
      .eq("id", productoId)
      .eq("company_id", empresaActualId)
      .select("id")
      .single();

  if (imagenError) {
    // Intentar retirar archivos que no quedaron vinculados
    const { error: limpiezaError } =
      await supabaseClient.storage
        .from("product-images")
        .remove(nuevasRutas);

    if (limpiezaError) {
      console.error("Error al limpiar imágenes:", limpiezaError);
    }

    throw imagenError;
  }
}


    
const estabaEditando = Boolean(productoEditandoId);


productForm.reset();

// Limpiar fotografías seleccionadas
imagenesSeleccionadas = [];
productImagesInput.value = "";
productImagesPreview.replaceChildren();

// Restablecer edición
productoEditandoId = null;
    cantidadImagenesExistentes = 0;
cancelEditButton.classList.add("hidden");

productForm.querySelector('button[type="submit"]')
  .textContent = "Guardar producto";

mensajeProducto(
  estabaEditando
    ? "Producto actualizado correctamente."
    : "Producto registrado correctamente."
);

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
    
.select("id, name, description, sku, price, stock, status, image_urls")

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

// ======================================
// INF3X - GALERÍA DEL PRODUCTO
// ======================================

const galeria = document.createElement("div");
galeria.className = "product-gallery";

const imagenes = producto.image_urls || [];
cantidadImagenesExistentes = imagenes.length;

imagenes.forEach(function(ruta) {
  const { data } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(ruta);

  // Contenedor individual de fotografía
  const contenedor = document.createElement("div");
  contenedor.className = "product-image-item";

  const imagen = document.createElement("img");
  imagen.src = data.publicUrl;
  imagen.alt = "Fotografía de " + producto.name;
  imagen.loading = "lazy";

  // Botón para eliminar fotografía
  const botonEliminar = document.createElement("button");
  botonEliminar.type = "button";
  botonEliminar.className = "delete-product-image";
  botonEliminar.textContent = "×";
  botonEliminar.title = "Eliminar fotografía";
  botonEliminar.setAttribute(
    "aria-label",
    "Eliminar fotografía de " + producto.name
  );

  botonEliminar.addEventListener("click", async function() {
    const confirmar = confirm(
      "¿Deseas eliminar esta fotografía definitivamente?"
    );

    if (!confirmar) return;

    botonEliminar.disabled = true;

    try {
      await eliminarFotografiaProducto(producto.id, ruta);

      mensajeProducto("Fotografía eliminada correctamente.");
      await cargarProductos();

    } catch (error) {
      console.error("Error al eliminar fotografía:", error);
      mensajeProducto(error.message, true);
      botonEliminar.disabled = false;
      await cargarProductos();
    }
  });

  contenedor.appendChild(imagen);
  contenedor.appendChild(botonEliminar);

  galeria.appendChild(contenedor);
});


if (imagenes.length > 0) {
  tarjeta.appendChild(galeria);
}

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

    // Botón para editar producto
    const acciones = document.createElement("div");
    acciones.className = "product-actions";

    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.textContent = "Editar producto";

    botonEditar.addEventListener("click", function() {
      editarProducto(producto);
    });

    acciones.appendChild(botonEditar);
    tarjeta.appendChild(acciones);

    productsList.appendChild(tarjeta);
  });
}

// ======================================
// INF3X - EDICIÓN DE PRODUCTOS
// ======================================

let productoEditandoId = null;

function editarProducto(producto) {
  if (!puedeAdministrarProductos || !empresaActualId) return;

  productoEditandoId = producto.id;
cancelEditButton.classList.remove("hidden");
  document.getElementById("productName").value =
    producto.name || "";

  document.getElementById("productDescription").value =
    producto.description || "";

  document.getElementById("productSku").value =
    producto.sku || "";

  document.getElementById("productPrice").value =
    producto.price;

  document.getElementById("productStock").value =
    producto.stock;

  document.getElementById("productStatus").value =
    producto.status;

  productForm.querySelector('button[type="submit"]')
    .textContent = "Actualizar producto";

  mensajeProducto("Editando producto: " + producto.name);

  productForm.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
// ======================================
// INF3X - CANCELAR EDICIÓN
// ======================================

const cancelEditButton =
  document.getElementById("cancelEditButton");

function cancelarEdicionProducto() {
  productoEditandoId = null;

  productForm.reset();

imagenesSeleccionadas = [];
productImagesInput.value = "";
productImagesPreview.replaceChildren();

  productForm.querySelector('button[type="submit"]')
    .textContent = "Guardar producto";

  cancelEditButton.classList.add("hidden");

  mensajeProducto("");
}

cancelEditButton.addEventListener(
  "click",
  cancelarEdicionProducto
);

// ======================================
// INF3X - VISTA PREVIA DE FOTOGRAFÍAS
// ======================================

const productImagesInput =
  document.getElementById("productImages");

const productImagesPreview =
  document.getElementById("productImagesPreview");

const MAX_PRODUCT_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

let imagenesSeleccionadas = [];

let cantidadImagenesExistentes = 0;

productImagesInput.addEventListener("change", function() {
  const archivos = Array.from(productImagesInput.files);

  imagenesSeleccionadas = [];
  productImagesPreview.replaceChildren();

  
const espaciosDisponibles =
  MAX_PRODUCT_IMAGES - cantidadImagenesExistentes;

if (archivos.length > espaciosDisponibles) {
  mensajeProducto(
    "Este producto tiene " +
    cantidadImagenesExistentes +
    " fotografía(s) guardada(s). " +
    "Puedes agregar máximo " +
    espaciosDisponibles +
    " fotografía(s) más.",
    true
  );

  productImagesInput.value = "";
  return;
}


  for (const archivo of archivos) {
    if (!ALLOWED_IMAGE_TYPES.includes(archivo.type)) {
      mensajeProducto(
        "Formato no permitido: " + archivo.name,
        true
      );
      productImagesInput.value = "";
      return;
    }

    if (archivo.size > MAX_IMAGE_SIZE) {
      mensajeProducto(
        "La fotografía supera los 5 MB: " + archivo.name,
        true
      );
      productImagesInput.value = "";
      return;
    }
  }

  imagenesSeleccionadas = archivos;

  archivos.forEach(function(archivo) {
    const imagen = document.createElement("img");
    const urlTemporal = URL.createObjectURL(archivo);

    imagen.src = urlTemporal;
    imagen.alt = archivo.name;

    imagen.addEventListener("load", function() {
      URL.revokeObjectURL(urlTemporal);
    }, { once: true });

    imagen.addEventListener("error", function() {
      URL.revokeObjectURL(urlTemporal);
    }, { once: true });

    productImagesPreview.appendChild(imagen);
  });

  if (archivos.length > 0) {
    mensajeProducto(
      archivos.length + " fotografía(s) seleccionada(s)."
    );
  } else {
    mensajeProducto("");
  }
});

// ======================================
// INF3X - SUBIR FOTOGRAFÍAS A SUPABASE
// ======================================

async function subirFotografiasProducto(productoId) {
  if (!empresaActualId || !puedeAdministrarProductos) {
    throw new Error("No tienes permisos para subir fotografías.");
  }

  if (imagenesSeleccionadas.length === 0) {
    return [];
  }

  if (imagenesSeleccionadas.length > MAX_PRODUCT_IMAGES) {
    throw new Error("Máximo 5 fotografías por selección.");
  }

  const rutasSubidas = [];

  try {
    for (const archivo of imagenesSeleccionadas) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(archivo.type) ||
        archivo.size > MAX_IMAGE_SIZE
      ) {
        throw new Error("Fotografía no válida: " + archivo.name);
      }

      const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
      }[archivo.type];

      const nombreArchivo =
        crypto.randomUUID() + "." + extension;

      const ruta =
        empresaActualId + "/" +
        productoId + "/" +
        nombreArchivo;

      const { error } = await supabaseClient.storage
        .from("product-images")
        .upload(ruta, archivo, {
          contentType: archivo.type,
          upsert: false
        });

      if (error) throw error;

      rutasSubidas.push(ruta);
    }

    return rutasSubidas;

  } catch (error) {
    // Limpiar archivos de esta subida incompleta
    if (rutasSubidas.length > 0) {
      const { error: cleanupError } =
        await supabaseClient.storage
          .from("product-images")
          .remove(rutasSubidas);

      if (cleanupError) {
        console.error(
          "No se pudieron limpiar las fotografías:",
          cleanupError
        );
      }
    }

    throw error;
  }
}

/* ======================================
   INF3X - ELIMINAR FOTOGRAFÍA
====================================== */


async function eliminarFotografiaProducto(productoId, ruta) {
  if (!empresaActualId || !puedeAdministrarProductos) {
    throw new Error("No tienes permisos para eliminar fotografías.");
  }

  const { data: producto, error: consultaError } =
    await supabaseClient
      .from("products")
      .select("image_urls")
      .eq("id", productoId)
      .eq("company_id", empresaActualId)
      .single();

  if (consultaError) throw consultaError;

  const imagenes = producto.image_urls || [];

  if (!imagenes.includes(ruta)) {
    throw new Error("La fotografía no pertenece al producto.");
  }

  if (!ruta.startsWith(
    empresaActualId + "/" + productoId + "/"
  )) {
    throw new Error("Ruta no autorizada.");
  }

  // Primero eliminar el archivo de Storage
  const { data: eliminados, error: storageError } =
    await supabaseClient.storage
      .from("product-images")
      .remove([ruta]);

  if (storageError) throw storageError;

  // Verificar que Storage haya reportado el archivo eliminado
  if (
    !Array.isArray(eliminados) ||
    !eliminados.some(archivo => archivo.name === ruta)
  ) {
    throw new Error(
      "Storage no confirmó la eliminación del archivo."
    );
  }

  // Después actualizar la base de datos
  const nuevasImagenes = imagenes.filter(
    imagen => imagen !== ruta
  );

  const { error: actualizacionError } =
    await supabaseClient
      .from("products")
      .update({ image_urls: nuevasImagenes })
      .eq("id", productoId)
      .eq("company_id", empresaActualId);

  if (actualizacionError) {
    throw new Error(
      "Archivo eliminado, pero no se pudo actualizar el producto: " +
      actualizacionError.message
    );
  }

  return true;
}
