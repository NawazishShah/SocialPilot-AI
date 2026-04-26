import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import Logs from './pages/Logs';
import Engine from './pages/Engine';
import Topics from './pages/Topics';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/engine" element={<Engine />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Layout>
  );
}

export default App;
