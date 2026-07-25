import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ canEdit, children }) {
  if (!canEdit) return <Navigate to="/" replace />;
  return children;
}
