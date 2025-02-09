// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect from "/" to "/logs" (or any route you prefer)
  return <Redirect href="/logs" />;
}
