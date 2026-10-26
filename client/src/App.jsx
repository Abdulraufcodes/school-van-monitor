import { AppRouter } from './routes/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
