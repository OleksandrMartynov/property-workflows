// Сторінки, доступні без входу (AC-EDITOR-09, AC-DSYS-03): лише вхід і підтвердження. Будь-яку іншу сторінку proxy
// перенаправляє на /login — це UX; дані захищають RLS і перевірка в кожній дії. Збіг — за цілим сегментом:
// «/login-x», «/authorize» чи інша сторінка під /auth публічними не є (новий маршрут входу — лише явно в списку).
const PUBLIC_PATHS = ["/login", "/auth/confirm"];

export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
