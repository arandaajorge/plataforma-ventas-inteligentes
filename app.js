
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
