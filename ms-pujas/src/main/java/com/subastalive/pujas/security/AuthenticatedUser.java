package com.subastalive.pujas.security;

import java.util.UUID;

/** Datos mínimos que cualquier endpoint necesita del usuario autenticado, sin importar el modo de auth activo. */
public record AuthenticatedUser(UUID sub, String rol) {
}
