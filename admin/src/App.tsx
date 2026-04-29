import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import Logs from './pages/Logs';
import Engine from './pages/Engine';
import Topics from './pages/Topics';
import Schedules from './pages/Schedules';
import Analytics from './pages/Analytics';
import Login from './pages/Login';

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('apiKey')
  );

  if (!authenticated) {
    return <Login onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/engine" element={<Engine />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Layout>
  );
}

export default App;
