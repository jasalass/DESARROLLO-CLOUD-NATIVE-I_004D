import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado o inválido' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.decode(token);
        if (!decoded) throw new Error('Token corrupto');

        req.user = {
            sub: decoded.sub || decoded.oid, 
            email: decoded.email || decoded.preferred_username,
            rol: decoded['cognito:groups'] ? decoded['cognito:groups'][0] : 'STAFF'
        };
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Fallo al procesar el token', detalle: error.message });
    }
};