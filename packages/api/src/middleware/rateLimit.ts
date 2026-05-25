import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes, intenta de nuevo en 15 minutos" },
});

export const guardarLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Límite de guardado alcanzado, espera 1 minuto" },
});
