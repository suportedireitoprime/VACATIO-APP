import { Navigate } from 'react-router-dom';

// Teoria was merged into the main /aprender hub. Redirect legacy links.
const AprenderTeoria = () => <Navigate to="/aprender" replace />;

export default AprenderTeoria;
