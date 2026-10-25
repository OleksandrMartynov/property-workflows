// Сторінки, доступні без входу (AC-EDITOR-09, AC-DSYS-03): лише вхід і підтвердження. Будь-яку іншу сторінку proxy
// перенаправляє на /login — це UX; дані захищають RLS і перевірка в кожній дії. Збіг — за цілим сегментом:
// «/login-x» чи «/authorize» публічними не є.
const PUBLIC_PATHS = ["/login", "/auth"];

export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
