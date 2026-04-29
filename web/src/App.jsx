import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import JobBoard from './pages/JobBoard';
import PostJob from './pages/PostJob';
import ApplyJob from './pages/ApplyJob';
import EmployerDashboard from './pages/EmployerDashboard';
import CandidateDashboard from './pages/CandidateDashboard';

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/apply/:jobId" element={<ApplyJob />} />
        <Route path="/dashboard/employer" element={<EmployerDashboard />} />
        <Route path="/dashboard/candidate" element={<CandidateDashboard />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <AppRoutes />
      <Footer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#14141F',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#14141F' }
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#14141F' }
          },
        }}
      />
    </BrowserRouter>
  );
}
